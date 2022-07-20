import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import { EventHubService } from '../eventhub.service.js';
import { ContractService } from '../contract.service.js';
import { IAttestedReport } from '../reportgen/reportgen.network.service.js';
import { default as Heap } from 'heap';
import BigNumber from 'bignumber.js';
import { computeMedian, randomPermutation } from '../helpers.js';

@Injectable()
export class TransmitService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(TransmitService.name);
  // Highest newEpoch received for each peer (including ourself)
  private _reports: Heap<{
    time: number;
    report: IAttestedReport;
  }> = new Heap((a, b) => a.time - b.time); // Order by report time

  private _lastTransmitedReport: {
    epoch: number;
    round: number;
    report: IAttestedReport;
  } | null = null;

  private _deltaStage: number = 20;
  private _timerTransmit: NodeJS.Timeout | null = null;

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _eventHubService: EventHubService,
    private readonly _contractService: ContractService
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  public async initialize(): Promise<void> {
    this._eventHubService.on('transmit', (epoch, round, reportToTransmit) =>
      this.onTransmit(epoch, round, reportToTransmit)
    );
  }

  public async onTransmit(epoch: number, round: number, report: IAttestedReport): Promise<void> {
    const lastBlockchainReport = await this._getLastBlockchainEpochAndRound(this._config.aggregatorAddress);

    if (
      lastBlockchainReport !== null &&
      this._isNewerEpochRound(epoch, round, lastBlockchainReport.epoch, lastBlockchainReport.round)
    ) {
      this._logger.verbose(
        `Report on blockchain is more recent than current epoch/round: (current e/r: ${epoch}/${round}, blockchain e/r: ${lastBlockchainReport?.epoch}/${lastBlockchainReport?.round})
        }), not transmitting`
      );
      return;
    }

    if (
      this._lastTransmitedReport !== null &&
      this._isNewerEpochRound(
        epoch,
        round,
        this._lastTransmitedReport.epoch,
        this._lastTransmitedReport.round
      )
    ) {
      this._logger.verbose(
        `Last report accepted from transmission is more recent than current epoch/round (current e/r: ${epoch}/${round}, last e/r: ${this._lastTransmitedReport.epoch}/ ${this._lastTransmitedReport.round}) , not transmitting`
      );
      return;
    }

    if (this._lastTransmitedReport === null) {
      await this.doTransmit(epoch, round, report);
      return;
    }

    const reportMedian = computeMedian(report);
    const previousMedian = computeMedian(this._lastTransmitedReport.report);
    const deviation = reportMedian.minus(previousMedian).abs().div(previousMedian.abs());
    const perThousandThreshold = new BigNumber(3);

    this._logger.log(
      `onTransmit: report ${report.epoch}/${
        report.round
      } median: ${reportMedian}, previousMedian: ${previousMedian}. Deviation: ${reportMedian
        .minus(previousMedian)
        .abs()
        .div(previousMedian.abs())}`
    );

    if (
      deviation.multipliedBy(1000).gte(perThousandThreshold) ||
      this._isNewerEpochRound(
        this._lastTransmitedReport.epoch,
        this._lastTransmitedReport.round,
        epoch,
        round
      )
    ) {
      this._logger.log(`onTransmit: will doTransmit`);
      await this.doTransmit(epoch, round, report);
      return;
    }
  }

  private _isNewerEpochRound(
    baseEpoch: number,
    baseRound: number,
    otherEpoch: number,
    otherRound: number
  ): boolean {
    if (otherEpoch > baseEpoch) {
      return true;
    }

    if (otherEpoch === baseEpoch) {
      return otherRound > baseRound;
    }

    return false;
  }

  public async doTransmit(epoch: number, round: number, report: IAttestedReport): Promise<void> {
    this._lastTransmitedReport = {
      epoch,
      round,
      report
    };

    const delay = await this._getTransmitDelayMs(epoch, round);
    this._reports.push({
      time: Date.now() + delay,
      report
    });

    const peekedReport = this._reports.peek();
    if (peekedReport === undefined) {
      // This should never happen, we just pushed a report
      return;
    }

    this._restartTransmitTimer(peekedReport.time - Date.now());
  }

  private async _getTransmitDelayMs(epoch: number, round: number): Promise<number> {
    const oracles1 = await this._contractService.getOraclesAddresses(this._config.aggregatorAddress);
    const oracles2 = Array.from(oracles1.keys());

    const seed = `${epoch}-${round}`; // TODO: this should maybe include oracle address, or secret (as specified in OCR paper?)
    const permuted = randomPermutation(oracles2, seed);

    const k = permuted.findIndex((oracle) => oracle === this._config.tezosAddress);
    return k * this._deltaStage * 1000;
  }

  private async _onTransmitTimerTimeout(): Promise<void> {
    const timeAndReport = this._reports.pop();
    if (timeAndReport === undefined) {
      return;
    }
    const { report } = timeAndReport;
    const lastBlockchainReport = await this._getLastBlockchainEpochAndRound(this._config.aggregatorAddress);

    if (
      lastBlockchainReport === null ||
      !this._isNewerEpochRound(
        report.epoch,
        report.round,
        lastBlockchainReport.epoch,
        lastBlockchainReport.round
      )
    ) {
      await this._contractService.sendReportBlockchain(report);
    } else {
      this._logger.verbose(
        `Report on blockchain is more recent than current epoch/round: (current e/r: ${report.epoch}/${report.round}, blockchain e/r: ${lastBlockchainReport?.epoch}/${lastBlockchainReport?.round})
        }), not transmitting`
      );
    }

    const peekedReport = this._reports.peek();
    if (peekedReport === undefined) {
      return;
    }

    this._restartTransmitTimer(peekedReport.time - Date.now());
  }

  private _stopTransmitTimer(): void {
    if (this._timerTransmit !== null) {
      clearTimeout(this._timerTransmit);
    }
  }

  private _restartTransmitTimer(delayMs: number): void {
    this._stopTransmitTimer();
    this._timerTransmit = setTimeout(() => this._onTransmitTimerTimeout(), delayMs);
  }

  private async _getLastBlockchainEpochAndRound(aggregatorAddress: string): Promise<{
    epoch: number;
    round: number;
    price: BigNumber;
  } | null> {
    return await this._contractService._getLastBlockchainReport(aggregatorAddress);
  }
}
