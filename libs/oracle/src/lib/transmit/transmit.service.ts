import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import { EventHubService } from '../event-hub/index.js';
import { ContractService } from '../contract/index.js';
import { computeMedian, IAttestedReport } from '../reportgen/index.js';
import { default as Heap } from 'heap';
import BigNumber from 'bignumber.js';
import { randomPermutation } from './helpers.js';
import { IOracleInformations } from '@tezosdynamics/contracts';
import { Timer } from '../pacemaker/timer.js';

/**
 * The pacemaker service as described in https://research.chain.link/ocr.pdf Section 5.4
 * Transmit service is responsible for transmitting a final report to the smart contract on the Tezos blockchain
 * 
 * How it works:
 * The service is listening on the event "transmit"
 * When this event is trigger, we will do some checks and do a transmit only if theses 3 conditions are accepted:
 *    - last report on blockchain is null so this is the forst one
 *    - we have a deviation:  the difference between the new and the previous report median is greater than the deviation threshold 
 *    - we have a new epoch / round on the report
 * The transmit operation is quite simple. We first get the delay, calculated with a random permutation.
 * Then we start the timer and we wait for it to end.
 * When the timer will be end, the report is sent to the blockchain
 * 
 */

@Injectable()
export class TransmitService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(TransmitService.name);
  // Highest newEpoch received for each peer (including ourself)
  private _reports: Heap<{
    time: number;
    report: IAttestedReport;
    aggregatorAddress: string;
    oracleAddresses: IOracleInformations[];
  }> = new Heap((a, b) => a.time - b.time); // Order by report time

  private _lastTransmitedReport: Map<
    string,
    {
      epoch: number;
      round: number;
      report: IAttestedReport;
    }
  > = new Map();

  private _deltaStage: number = 20 * 1000; // miliseconds number between two stages
  private _timerTransmit: Timer = new Timer(this._onTransmitTimerTimeout.bind(this),0);

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _eventHubService: EventHubService,
    private readonly _contractService: ContractService
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  /**
   * Initialize the transmit service state and start listening to the transmit event
   */
  public async initialize(): Promise<void> {
    this._eventHubService.addListener('transmit', (aggregatorAddress, oracleAddresses, reportToTransmit) =>
      this.onTransmit(aggregatorAddress, oracleAddresses, reportToTransmit)
    );
  }

  public async onTransmit(
    aggregatorAddress: string,
    oracleAddresses: IOracleInformations[],
    report: IAttestedReport
  ): Promise<void> {
    const lastBlockchainReport = await this._getLastBlockchainEpochAndRound(aggregatorAddress);
    
    this._logger.log(`${aggregatorAddress}/${report.epoch}/${report.round} - Treating report`);

    if (
      lastBlockchainReport !== null &&
      this._isNewerEpochRound(
        report.epoch,
        report.round,
        lastBlockchainReport.epoch,
        lastBlockchainReport.round
      )
    ) {
      this._logger.debug(
        `${aggregatorAddress}/${report.epoch}/${report.round} - Last report on blockchain is more recent than epoch/round: ${lastBlockchainReport?.epoch}/${lastBlockchainReport?.round}, discarding`
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
      this._logger.debug(
        `${aggregatorAddress}/${report.epoch}/${report.round} - Last report accepted from transmission is more recent than epoch/round: ${lastTransmitedReport.epoch}/${lastTransmitedReport.round}, discarding`
      );
      return;
    }

    if (lastTransmitedReport === undefined) {
      this._logger.log(
        `${aggregatorAddress}/${report.epoch}/${report.round} - This is the first report accepted for transmission, doing transmit`
      );
      await this.doTransmit(report.epoch, report.round, aggregatorAddress, oracleAddresses, report);
      return;
    }

    const reportMedian = computeMedian(report);
    const previousMedian = computeMedian(lastTransmitedReport.report);

    const deviation = reportMedian.minus(previousMedian).abs().div(previousMedian.abs()).multipliedBy(1000);
    const perThousandThreshold = new BigNumber(3); // TODO: fetch value from blockchain

    this._logger.log(
      `${aggregatorAddress}/${report.epoch}/${report.round} - Previous median: ${previousMedian}`
    );
    this._logger.log(`${aggregatorAddress}/${report.epoch}/${report.round} - Median: ${reportMedian}`);
    this._logger.log(`${aggregatorAddress}/${report.epoch}/${report.round} - Deviation: ${deviation}‰`);

    if (deviation.gte(perThousandThreshold)) {
      this._logger.log(
        `${aggregatorAddress}/${report.epoch}/${report.round} - Deviation is over threshold, doing transmit`
      );
      await this.doTransmit(report.epoch, report.round, aggregatorAddress, oracleAddresses, report);
      return;
    }

    if (
      this._isNewerEpochRound(
        lastTransmitedReport.epoch,
        lastTransmitedReport.round,
        report.epoch,
        report.round
      )
    ) {
      this._logger.log(
        `${aggregatorAddress}/${report.epoch}/${report.round} - Deviation is not over threshold, but new epoch/round, doing transmit`
      );
      await this.doTransmit(report.epoch, report.round, aggregatorAddress, oracleAddresses, report);
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
    oracleAddresses: IOracleInformations[],
    report: IAttestedReport
  ): Promise<void> {
    this._lastTransmitedReport.set(aggregatorAddress, {
      epoch,
      round,
      report
    });

    const delay = await this._getTransmitDelayMs(aggregatorAddress, oracleAddresses, epoch, round);
    this._reports.push({
      time: Date.now() + delay,
      report,
      aggregatorAddress,
      oracleAddresses
    });

    const peekedReport = this._reports.peek()!; // Should never be null since we just pushed a report

    this._logger.verbose(
      `Report ${aggregatorAddress}/${report.epoch}/${
        report.round
      } pushed to report queue. Will transmit at ${new Date(peekedReport.time)}`
    );

    this._timerTransmit.restart(peekedReport.time - Date.now());
  }

  private async _getTransmitDelayMs(
    aggregatorAddress: string,
    oracleAddresses: IOracleInformations[],
    epoch: number,
    round: number
  ): Promise<number> {
    const seed = `${aggregatorAddress}-${epoch}-${round}`;

    const permuted = randomPermutation(
      oracleAddresses.map((addrs) => addrs.oracleAddress),
      seed
    );

    const k = permuted.findIndex((oracle) => oracle === this._config.tezosAddress);
    return k * this._deltaStage;
  }

  // _timerTransmit end will trigger this method 
  private async _onTransmitTimerTimeout(): Promise<void> {
    const timeAndReport = this._reports.pop();
    if (timeAndReport === undefined) {
      return;
    }
    const { report, aggregatorAddress, oracleAddresses } = timeAndReport;
    const lastBlockchainReport = await this._getLastBlockchainEpochAndRound(aggregatorAddress);

    // if we have epoch/round is higher than the one in the blockchain OR if this is the first time we commit (report on blockchain is null)
    if (
      lastBlockchainReport === null ||
      !this._isNewerEpochRound(
        report.epoch,
        report.round,
        lastBlockchainReport.epoch,
        lastBlockchainReport.round
      )
    ) {
      this._logger.log(`${aggregatorAddress}/${report.epoch}/${report.round} - Sending tx to blockchain`);
      await this._contractService.sendReportBlockchain(aggregatorAddress, oracleAddresses, report);
    } else {
      this._logger.verbose(
        `${aggregatorAddress}/${report.epoch}/${report.round} - Report on blockchain is more recent than current epoch/round: ${lastBlockchainReport?.epoch}/${lastBlockchainReport?.round})
        }), not transmitting`
      );
    }

    const peekedReport = this._reports.peek();
    // if nothing is in the queue, we stop
    if (peekedReport === undefined) {
      return;
    }
    // else we restart the timer
    this._timerTransmit.restart(peekedReport.time - Date.now());
  }

  private async _getLastBlockchainEpochAndRound(aggregatorAddress: string): Promise<{
    epoch: number;
    round: number;
    price: BigNumber;
    time: number;
  } | null> {
    return await this._contractService.getLastBlockchainReport(aggregatorAddress);
  }
}
