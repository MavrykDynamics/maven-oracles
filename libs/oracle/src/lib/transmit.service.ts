import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from './oracle.config.js';
import { EventHubService } from './eventhub.service.js';
import { ContractService } from './contract.service.js';
import { IAttestedReport, ISignature } from './reportgen.network.service.js';
import { default as Heap } from 'heap';
import BigNumber from 'bignumber.js';

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
      this._isNewerEpochRound(
        epoch,
        round,
        lastBlockchainReport.epoch,
        lastBlockchainReport.round
      )
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

    const reportMedian = this._computeMedian(report);
    const previousMedian = this._computeMedian(this._lastTransmitedReport.report);
    const deviation = reportMedian.minus(previousMedian).abs().div(previousMedian.abs());
    const perThousandThreshold = new BigNumber(5);

    if (
      deviation.multipliedBy(1000).gte(perThousandThreshold) ||
      this._isNewerEpochRound(
        this._lastTransmitedReport.epoch,
        this._lastTransmitedReport.round,
        epoch,
        round
      )
    ) {
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
      return otherRound >= baseRound;
    }

    return false;
  }

  public async doTransmit(epoch: number, round: number, report: IAttestedReport): Promise<void> {
    this._lastTransmitedReport = {
      epoch,
      round,
      report
    };

    const delay = this._getTransmitDelay(epoch, round);
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

  private _getTransmitDelay(epoch: number, delay: number): number {
    // TODO: implement
    return 2;
  }

  private _computeMedian(report: IAttestedReport): BigNumber {
    report.observations.sort((a, b) => { return a.price.minus(b.price).toNumber(); });
    var half = Math.floor(report.observations.length / 2);
  
    if (report.observations.length % 2)
      return report.observations[half].price;
    
    return (report.observations[half - 1].price.plus(report.observations[half].price)).dividedBy(2.0);
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
        lastBlockchainReport.round)
    ) {
      if (!this._IsItMyTurn(report)) {
        this._logger.verbose("not my turn to post on blockchain");
        return;
      }
      this._logger.log(`Sending report ${JSON.stringify(report)} to blockchain`);
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

  private _restartTransmitTimer(delay: number): void {
    this._stopTransmitTimer();
    this._timerTransmit = setTimeout(() => this._onTransmitTimerTimeout(), delay);
  }

  private async _getLastBlockchainEpochAndRound(aggregatorAddress: string): Promise<{
    epoch: number;
    round: number;
    price: number;
  } | null> {
    return await this._contractService._getLastBlockchainEpochAndRound(aggregatorAddress);
  }

  private _IsItMyTurn(report: IAttestedReport): boolean {
    report.signatures.sort((a, b) => a.oracle.localeCompare(b.oracle));
    const index = report.signatures.findIndex( oracle => oracle.oracle === this._config.tezosAddress)
    if (index < 0){
      return false;
    }

    const reportIndex = report.epoch % report.observations.length;
    console.log(`report.epoch: ${report.epoch} | report.observations.length: ${report.observations.length}`)
    console.log(`index: ${index} -> reportIndex: ${reportIndex}`);
    console.log(`report.epoch: ${report.epoch}`)
    return index === reportIndex;
    }
}
