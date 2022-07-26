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
    aggregatorAddress: string;
  }> = new Heap((a, b) => a.time - b.time); // Order by report time

  private _lastTransmitedReport: Map<
    string,
    {
      epoch: number;
      round: number;
      report: IAttestedReport;
    }
  > = new Map();

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
    this._eventHubService.on('transmit', (aggregatorAddress, reportToTransmit) =>
      this.onTransmit(aggregatorAddress, reportToTransmit)
    );
  }

  public async onTransmit(aggregatorAddress: string, report: IAttestedReport): Promise<void> {
    const lastBlockchainReport = await this._getLastBlockchainEpochAndRound(aggregatorAddress);
    this._logger.log(
      `onTransmit: Received report ${report.epoch}/${report.round} for aggregator address ${aggregatorAddress}`
    );
    if (
      lastBlockchainReport !== null &&
      this._isNewerEpochRound(
        report.epoch,
        report.round,
        lastBlockchainReport.epoch,
        lastBlockchainReport.round
      )
    ) {
      this._logger.verbose(
        `Report on blockchain is more recent than current epoch/round: (current e/r: ${report.epoch}/${report.round}, blockchain e/r: ${lastBlockchainReport?.epoch}/${lastBlockchainReport?.round})
        }), not transmitting`
      );
      return;
    }

    const lastTransmitedReport = this._lastTransmitedReport.get(aggregatorAddress);

    if (
      lastTransmitedReport !== undefined &&
      this._isNewerEpochRound(
        report.epoch,
        report.round,
        lastTransmitedReport.epoch,
        lastTransmitedReport.round
      )
    ) {
      this._logger.verbose(
        `Last report accepted from transmission is more recent than current epoch/round (current e/r: ${report.epoch}/${report.round}, last e/r: ${lastTransmitedReport.epoch}/ ${lastTransmitedReport.round}) , not transmitting`
      );
      return;
    }

    if (lastTransmitedReport === undefined) {
      await this.doTransmit(report.epoch, report.round, aggregatorAddress, report);
      return;
    }

    const reportMedian = computeMedian(report);
    const previousMedian = computeMedian(lastTransmitedReport.report);
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
        lastTransmitedReport.epoch,
        lastTransmitedReport.round,
        report.epoch,
        report.round
      )
    ) {
      await this.doTransmit(report.epoch, report.round, aggregatorAddress, report);
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

  public async doTransmit(
    epoch: number,
    round: number,
    aggregatorAddress: string,
    report: IAttestedReport
  ): Promise<void> {
    this._lastTransmitedReport.set(aggregatorAddress, {
      epoch,
      round,
      report
    });

    const delay = await this._getTransmitDelayMs(aggregatorAddress, epoch, round);
    this._reports.push({
      time: Date.now() + delay,
      report,
      aggregatorAddress
    });

    const peekedReport = this._reports.peek()!; // Should never be null since we just pushed a report

    this._logger.verbose(
      `Report ${aggregatorAddress}/${report.epoch}/${
        report.round
      } pushed to report queue. Will transmit at ${new Date(peekedReport.time)}`
    );

    this._restartTransmitTimer(peekedReport.time - Date.now());
  }

  private async _getTransmitDelayMs(
    aggregatorAddress: string,
    epoch: number,
    round: number
  ): Promise<number> {
    const oracles1 = await this._contractService.getOraclesAddresses(aggregatorAddress);
    const oracles2 = Array.from(oracles1.keys());

    const seed = `${aggregatorAddress}-${epoch}-${round}`;
    const permuted = randomPermutation(oracles2, seed);

    const k = permuted.findIndex((oracle) => oracle === this._config.tezosAddress);
    return k * this._deltaStage * 1000;
  }

  private async _onTransmitTimerTimeout(): Promise<void> {
    const timeAndReport = this._reports.pop();
    if (timeAndReport === undefined) {
      return;
    }
    const { report, aggregatorAddress } = timeAndReport;
    const lastBlockchainReport = await this._getLastBlockchainEpochAndRound(aggregatorAddress);

    if (
      lastBlockchainReport === null ||
      !this._isNewerEpochRound(
        report.epoch,
        report.round,
        lastBlockchainReport.epoch,
        lastBlockchainReport.round
      )
    ) {
      this._logger.log(
        `Transmitting report for e/r ${report.epoch}/${report.round} on aggregator ${aggregatorAddress}`
      );
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
