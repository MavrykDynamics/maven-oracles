import { Injectable, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import { EventHubService } from '../event-hub/index.js';
import { ContractService } from '../contract/index.js';
import { computeMedian, IAttestedReport } from '../reportgen/index.js';
import { default as Heap } from 'heap';
import BigNumber from 'bignumber.js';
import { randomPermutation } from './helpers.js';
import { IOracleInformations } from '@mavrykdynamics/contracts';
import { Timer } from '../pacemaker/timer.js';
import { getLogger } from '../logger.js';
import { Logger } from 'winston';

/**
 * The transmit service as described in {@link https://research.chain.link/ocr.pdf} Section 5.4
 * Transmit service is responsible for transmitting a final report to the smart contract on the blockchain
 *
 * How it works:
 *
 * The service logic is triggered on the "transmit" event
 * When this event is trigger, we will do some checks and transmit only if one of these 3 conditions is accepted:
 *    - The report is the first one (last report on blockchain is epoch/round 0/0)
 *    - A deviation is detected: the difference between the new and the previous report median is greater than the deviation threshold
 *    - The report epoch/round is fresher than the one on the blockchain
 *
 * The transmit operation is quite simple:
 * - We first compute our oracle delay for sending the report, each oracle get a different value, which varies each round
 * (Random is seeded by common value between all oracle, this ensures every oracle get the same pseudo-random permutation)
 * - Then we start the timer and wait for it to end.
 * - When the timer end, the report is sent to the blockchain if it isn't present there yet
 */

@Injectable()
export class TransmitService implements OnModuleInit {
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: EventHubService.name
    }
  });

  // Report queue ordered by time (the most imminent is first)
  private _reports: Heap<{
    time: number;
    report: IAttestedReport;
    aggregatorAddress: string;
    oracleAddresses: IOracleInformations[];
  }> = new Heap((a, b) => a.time - b.time); // Order by report time

  // Cached last report transmitted for each aggregator:
  // aggregator address -> last report infos
  private _lastTransmittedReport: Map<
    string,
    {
      epoch: number;
      round: number;
      report: IAttestedReport;
    }
  > = new Map();

  // Time between oracle try to send the report to the blockchain. This value should be greater than the block time to avoid failing transactions
  private _delta: number = 20 * 1000; // miliseconds number between two stages

  /// Transmit timer
  private _timerTransmit: Timer = new Timer(this._onTransmitTimerTimeout.bind(this), 0);

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
    this._eventHubService.addListener(
      'transmit',
      (aggregatorAddress, oracleAddresses, reportToTransmit, alphaPerThousand) =>
        this.onTransmit(aggregatorAddress, oracleAddresses, reportToTransmit, alphaPerThousand)
    );
  }

  /**
   * Entrypoint of the service, it is called on transmit event.
   *
   * First, check if the report should be sent
   * If so, place it in the report queue.
   * Then, restart the timer, so it wakes up when the most imminent report is due.
   *
   * @param aggregatorAddress - Aggregator smart contract address
   * @param oracleAddresses - Information about the oracles (pk, pkh and peer id)
   * @param report - Report to transmit
   * @param alphaPerThousand - Threshold value
   */
  public async onTransmit(
    aggregatorAddress: string,
    oracleAddresses: IOracleInformations[],
    report: IAttestedReport,
    alphaPerThousand: BigNumber
  ): Promise<void> {
    const lastBlockchainReport = await this._contractService.getLastBlockchainReport(aggregatorAddress);

    this._logger.info(`${aggregatorAddress}/${report.epoch}/${report.round} - Treating report`);

    // Check if received report is more recent than the last one in the aggregator smart contract
    // (Oe, Or) ≤ (Ce, Cr)
    if (
      lastBlockchainReport !== null &&
      this._isNewerOrEqualEpochRound(
        report.epoch, // Oe
        report.round, // Or
        lastBlockchainReport.epoch, // Ce
        lastBlockchainReport.round // Cr
      )
    ) {
      this._logger.debug(
        `${aggregatorAddress}/${report.epoch}/${report.round} - Last report on blockchain is more recent than epoch/round: ${lastBlockchainReport?.epoch}/${lastBlockchainReport?.round}, discarding`
      );
      return;
    }

    // Fetch last transmitted report from the cache
    const lastTransmittedReport = this._lastTransmittedReport.get(aggregatorAddress);

    // Check if received report is more recent than the last one in the cache
    // If it is not, discard the report
    // (Oe, Or) ≤ (Le, Lr)
    if (
      lastTransmittedReport !== undefined &&
      this._isNewerOrEqualEpochRound(
        report.epoch, // Oe
        report.round, // Or
        lastTransmittedReport.epoch, // Le
        lastTransmittedReport.round // Lr
      )
    ) {
      this._logger.debug(
        `${aggregatorAddress}/${report.epoch}/${report.round} - Last report accepted from transmission is more recent than epoch/round: ${lastTransmittedReport.epoch}/${lastTransmittedReport.round}, discarding`
      );
      return;
    }

    // If there is no last transmitted report in cache, queue the report for transmission
    if (lastTransmittedReport === undefined) {
      this._logger.info(
        `${aggregatorAddress}/${report.epoch}/${report.round} - This is the first report accepted for transmission, doing transmit`
      );
      await this.doTransmit(report.epoch, report.round, aggregatorAddress, oracleAddresses, report);
      return;
    }

    // Compute the deviation to see if it is above threshold
    const reportMedian = computeMedian(report);
    const previousMedian = computeMedian(lastTransmittedReport.report);

    const deviation = reportMedian.minus(previousMedian).abs().div(previousMedian.abs()).multipliedBy(1000); // We compute in ‰ (per thousand, so we multiply the value by 1000)

    this._logger.info(
      `${aggregatorAddress}/${report.epoch}/${report.round} - Previous median: ${previousMedian}`
    );
    this._logger.info(`${aggregatorAddress}/${report.epoch}/${report.round} - Median: ${reportMedian}`);
    this._logger.info(`${aggregatorAddress}/${report.epoch}/${report.round} - Deviation: ${deviation}‰`);

    // If a deviation is detected, queue the report for transmission
    if (deviation.gte(alphaPerThousand)) {
      this._logger.info(
        `${aggregatorAddress}/${report.epoch}/${report.round} - Deviation is over threshold, doing transmit`
      );
      await this.doTransmit(report.epoch, report.round, aggregatorAddress, oracleAddresses, report);
      return;
    }

    // If last transmitted report is older than the blockchain report, queue the report for transmission
    // (Le, Lr) ≤ (Ce, Cr)
    if (
      lastBlockchainReport !== null &&
      this._isNewerOrEqualEpochRound(
        lastTransmittedReport.epoch, //Ce
        lastTransmittedReport.round, //Cr
        lastBlockchainReport.epoch, // Le
        lastBlockchainReport.round // Lr
      )
    ) {
      this._logger.info(
        `${aggregatorAddress}/${report.epoch}/${report.round} - Deviation is not over threshold, but new epoch/round, doing transmit`
      );
      await this.doTransmit(report.epoch, report.round, aggregatorAddress, oracleAddresses, report);
      return;
    }
  }

  /**
   * Compute if epoch/round (e2/r2) is newer than (e1/r1).
   * Return true if epoch/round are equal
   *
   * Examples:
   * - (2/0) is more recent than (2/0)(1/3)
   * - (1/1) is more recent than (1/1)(1/0)
   * - (1/1) is not more recent than (1/1)(1/1)
   * - (1/1) is not more recent than (1/1)(1/2)
   * - (0/3) is not more recent than (0/3)(1/0)
   *
   * @param baseEpoch - e1
   * @param baseRound - r1
   * @param otherEpoch - e2
   * @param otherRound - r2
   * @private
   *
   * @returns boolean
   */
  private _isNewerOrEqualEpochRound(
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

  /**
   * Queue report for transmission:
   *
   * - Compute the delay between now and transmission attempt
   * - Add report to queue
   * - Restart timer, so it wakes up for the most imminent report
   *
   * @param epoch - Report epoch
   * @param round - Report round
   * @param aggregatorAddress - Aggregator smart contract address
   * @param oracleAddresses - Information about the oracles (pk, pkh and peer id)
   * @param report - Report
   */
  public async doTransmit(
    epoch: number,
    round: number,
    aggregatorAddress: string,
    oracleAddresses: IOracleInformations[],
    report: IAttestedReport
  ): Promise<void> {
    this._lastTransmittedReport.set(aggregatorAddress, {
      epoch,
      round,
      report
    });

    // Compute oracle delay for this report
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

    // Restart timer, so it wakes up for the most imminent report
    this._timerTransmit.restart(peekedReport.time - Date.now());
  }

  /**
   * Compute delay for oracle based on a pseudo random permutation.
   *
   * Random is seeded by common value between all oracle, this ensures every oracle get the same pseudo-random permutation
   * The delay is computed by: `i * delta`, with
   * - `i` being the oracle index in the permutation
   * - `delay` being a constant value
   *
   * See Algorithm 5, "transmit-delay" from {@link https://research.chain.link/ocr.pdf}
   *
   * @param aggregatorAddress
   * @param oracleAddresses
   * @param epoch
   * @param round
   * @private
   */
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
    return k * this._delta;
  }

  /**
   * Triggered by the end of transmit timer
   *
   * This will take the first report in the queue, check if it still needs to be sent to the aggregator.
   * If so, it will send it.
   *
   * @private
   */
  private async _onTransmitTimerTimeout(): Promise<void> {
    const timeAndReport = this._reports.pop();

    // No report to send, ignoring
    if (timeAndReport === undefined) {
      return;
    }
    const { report, aggregatorAddress, oracleAddresses } = timeAndReport;
    const lastBlockchainReport = await this._contractService.getLastBlockchainReport(aggregatorAddress);

    // if we have epoch/round is higher than the one in the blockchain OR if this is the first time we commit (report on blockchain is null)
    if (
      lastBlockchainReport === null ||
      !this._isNewerOrEqualEpochRound(
        report.epoch,
        report.round,
        lastBlockchainReport.epoch,
        lastBlockchainReport.round
      )
    ) {
      this._logger.info(`${aggregatorAddress}/${report.epoch}/${report.round} - Sending tx to blockchain`);
      await this._contractService.sendReportBlockchain(aggregatorAddress, oracleAddresses, report);
    } else {
      this._logger.verbose(
        `${aggregatorAddress}/${report.epoch}/${report.round} - Report on blockchain is more recent than current epoch/round: ${lastBlockchainReport?.epoch}/${lastBlockchainReport?.round})
        }), not transmitting`
      );
    }

    // Restart the timer for the next report

    const peekedReport = this._reports.peek();

    // if nothing is in the queue, just ignore.
    if (peekedReport === undefined) {
      return;
    }
    // else we restart the timer
    this._timerTransmit.restart(peekedReport.time - Date.now());
  }
}
