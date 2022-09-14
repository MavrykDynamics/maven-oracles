import { Logger } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import BigNumber from 'bignumber.js';
import { ReportGenNetworkService } from './reportgen.network.service.js';
import {
  IAttestedReport,
  ICompressedReport,
  IFinalEchoMessage,
  IFinalMessage,
  IObserveReqMessage,
  IReport,
  IReportGenEvents,
  IReportReqMessage,
  ISignature
} from './reportgen.types.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { EventHubService } from '../event-hub/index.js';
import { computeMedian } from './helpers.js';
import { signData, verifyData } from './helpers.js';
import { ContractService } from '../contract/index.js';
import { PriceService } from '../price/index.js';
import { IReportGenConfig } from './reportgen.config.js';
import { computeFValueFrom } from '../pacemaker/helpers.js';
import { useMutex } from '../helpers/useMutex.js';
import { Mutex } from 'async-mutex';

/**
 * Report Generation Follower service as described in {@link https://research.chain.link/ocr.pdf} Section 5.3
 *
 * ReportGenLeaderService are instantiated by the Pacemaker service using the ReportGenFactoryService service.
 * It is instantiated in pair with {@link ReportGenLeaderService} if the oracle is the leader of the epoch
 *
 * The role of the report generation service is to handle an epoch:
 *  - It keeps track of the current round, which increment
 *  - It request observation from price fetchers
 *  - It communicate with other oracles to establish a report containing observations from everyone
 *  - It gives the report to the TransmitService once it's ready
 *
 *
 *  How it works:
 *    - on receiving {@link IReportGenEvents.observeReq} message from the leader, fetch observation, sign it and send it back in an {@link IReportGenEvents.observe} message.
 *    - on receiving {@link IReportGenEvents.reportReq} message from the leader, verify report, sign it and send it back in a {@link IReportGenEvents.report} message.
 *    - on receiving {@link IReportGenEvents.final} message from the leader, verify report and broadcast {@link IReportGenEvents.finalEcho} message.
 *    - on receiving enough {@link IReportGenEvents.finalEcho} message, give the report to TransmitService for transmission.
 *
 */
export class ReportGenFollowerService {
  private readonly _logger: Logger = new Logger(ReportGenFollowerService.name);

  // Do not remove, it is used by @useMutex annotations
  // This is used to make sure that handlers are executed sequentially
  // See first paragraph of Section 5 in https://research.chain.link/ocr.pdf:
  //
  // "Handlers are executed atomically, i.e., in a serializable
  // and mutually exclusive way, per protocol instance and per node such that no two handler executions of the same
  // instance interleave."
  private readonly _mutex: Mutex = new Mutex();

  // Current epoch and leader
  private readonly _epoch: number;
  private readonly _leader: string;

  // Current round of the epoch, start at 0 and is increment after each report generation.
  // Once it hit _roundMax, we stop and emit a "changeLeader" event
  private _round: number = 0;

  // Report sent after "final" is received, null if we don't have received it yet.
  // It is reset to null at the beginning of each round (on receiving 'observeReq')
  private _sentEcho: IAttestedReport | null = null;

  // Flag indicating if we already sent a report for the current round.
  // It is reset to false at the beginning of each round (on receiving 'observeReq')
  private _sentReport: boolean = false;

  // Flag indicating the current round is completed
  // It is reset to false at the beginning of each round (on receiving 'observeReq')
  private _completedRound: boolean = false;

  // Map of received "finalEcho" message from other oracles for the current round.
  // Used to know when enough oracle agree on the report
  // It is reset to an empty map at the beginning of each round (on receiving 'observeReq')
  private _receivedEcho: Map<string, boolean> = new Map();

  // Max number of rounds in an epoch
  // 3 - 20 recommended by OCR white paper
  private readonly _roundMax: number = 3;

  // Handlers for events
  // We declare them as property to be able to remove listeners on service shutdown
  private readonly _onObserveReqReceivedHandler: IReportGenEvents['observeReq'] =
    this._onObserveReqReceived.bind(this);
  private readonly _onReportReqReceivedHandler: IReportGenEvents['reportReq'] =
    this._onReportReqReceived.bind(this);
  private readonly _onFinalReceivedHandler: IReportGenEvents['final'] = this._onFinalReceived.bind(this);
  private readonly _onFinalEchoReceivedHandler: IReportGenEvents['finalEcho'] =
    this._onFinalEchoReceived.bind(this);

  public constructor(
    private readonly _oracleConfig: OracleConfig,
    private readonly _reportGenNetworkService: ReportGenNetworkService,
    private readonly _eventHubService: EventHubService,
    private readonly _contractService: ContractService,
    private readonly _priceService: PriceService,
    private readonly _reportGenConfig: IReportGenConfig
  ) {
    this._epoch = this._reportGenConfig.epoch;
    this._leader = this._reportGenConfig.leader;

    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch} Starting reportgen follower instance with leader ${this._leader}`
    );

    // Start listening to event
    this._reportGenNetworkService.addListener('observeReq', this._onObserveReqReceivedHandler);
    this._reportGenNetworkService.addListener('reportReq', this._onReportReqReceivedHandler);
    this._reportGenNetworkService.addListener('final', this._onFinalReceivedHandler);
    this._reportGenNetworkService.addListener('finalEcho', this._onFinalEchoReceivedHandler);
  }

  public stop(): void {
    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}  Stopping reportgen follower instance`
    );
    // Stop listening to event
    this._reportGenNetworkService.removeListener('observeReq', this._onObserveReqReceivedHandler);
    this._reportGenNetworkService.removeListener('reportReq', this._onReportReqReceivedHandler);
    this._reportGenNetworkService.removeListener('final', this._onFinalReceivedHandler);
    this._reportGenNetworkService.removeListener('finalEcho', this._onFinalEchoReceivedHandler);
  }

  /**
   * Handler for "observeReq" message.
   * Leader is asking us for our price observation.
   *
   * @param from - Sender of the message
   * @param observeReqMessage - received "observeReq" message
   * @private
   *
   * Start by doing checks on received information:
   *   - Is aggregator address the same as ours ? (We receive message for all aggregators)
   *   - Is sender the leader ?
   *   - Is round number correct greater than the previous one ?
   *   - Is round number correct lower than max round ?
   *
   * If all these checks pass, fetch price using PriceFetcherService, sign it and send it back
   */
  @useMutex()
  private async _onObserveReqReceived(from: PeerId, observeReqMessage: IObserveReqMessage): Promise<void> {
    if (observeReqMessage.aggregatorAddress !== this._reportGenConfig.aggregatorAddress) {
      // Silently ignore messages for other aggregators
      return;
    }

    if (from.toString() !== this._leader) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Observation request received from ${from.toString()}, which is not the leader (${
          this._leader
        }), discarding`
      );
      return;
    }

    if (this._round >= observeReqMessage.round || observeReqMessage.round > this._roundMax + 1) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Observation request invalid round number (${observeReqMessage.round}), discarding request`
      );
      return;
    }

    // Increment round
    this._round = observeReqMessage.round;

    if (this._round > this._roundMax) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Observation request round (${this._round}) is over max round number ${this._roundMax}, discarding request and changing leader`
      );
      this._eventHubService.changeLeader(this._reportGenConfig.aggregatorAddress);
      return;
    }

    // Reset state
    this._sentEcho = null;
    this._sentReport = false;
    this._completedRound = false;
    this._receivedEcho = new Map();

    const { decimals } = await this._contractService.getAggregatorConfig(
      this._reportGenConfig.aggregatorAddress
    );

    const observation = await this._priceService.getPrice(decimals, this._reportGenConfig.aggregatorPair);

    const signature = await this._signObservation(observation);

    await this._reportGenNetworkService.sendObserve(from, {
      aggregatorAddress: this._reportGenConfig.aggregatorAddress,
      epoch: this._epoch,
      round: observeReqMessage.round,
      observation,
      signature
    });
  }

  /**
   * Handler for "reportReq" message.
   * Leader is asking us to sign a report.
   *
   * @param from - Sender of the message
   * @param report - Report to sign
   * @param aggregatorAddress - Address of the aggregator smart contract
   * @private
   *
   * Start by doing checks on received information:
   *   - Is aggregator address the same as ours ? (We receive message for all aggregators)
   *   - Is sender the leader ?
   *   - Is report observations sorted ?
   *   - Does report have enough observations ? (It needs at least 2f + 1)
   *   - Does observations signatures matches ?
   *
   * If all of these checks pass, compress report (= remove observation signatures), sign it and send it back to the leader.
   */
  @useMutex()
  private async _onReportReqReceived(
    from: PeerId,
    { report, aggregatorAddress }: IReportReqMessage
  ): Promise<void> {
    if (aggregatorAddress !== this._reportGenConfig.aggregatorAddress) {
      // Silently ignore messages for other aggregators
      return;
    }

    if (from.toString() !== this._leader) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Report req received from ${from.toString()}, which is not the leader (${
          this._leader
        }), discarding`
      );
      return;
    }

    // a.oracle.localeCompare(b.oracle)
    const isReportSorted = report.observations.every(
      (v, i) => i === 0 || report.observations[i - 1].oracle.localeCompare(v.oracle) <= 0
    );

    if (!isReportSorted) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Report received from ${from.toString()} is not sorted, discarding report request`
      );
      return;
    }

    const distinctOracleObservations = [...new Set(report.observations.map((ob) => ob.oracle))];

    const f = computeFValueFrom(this._reportGenConfig.oracleAddresses.length);
    if (distinctOracleObservations.length < f * 2 + 1) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Report received from ${from.toString()} is has not enough observation (${
          distinctOracleObservations.length
        }) from different oracles, discarding`
      );
      return;
    }

    const signaturesChecks = await Promise.all(
      report.observations.map(async (ob) => {
        const pubKey = await this._reportGenNetworkService.getPublicKeyOfPeerId(ob.oracle);
        return this._verifyObservationSignature(ob.price, ob.signature, pubKey);
      })
    );

    if (!signaturesChecks.every((ok) => ok)) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Report received from ${from.toString()} has signatures that do not match, discarding`
      );
      return;
    }

    const shouldReport = await this._shouldReport(report);
    if (shouldReport) {
      // Compress report (= remove observations signatures)
      // Observation signatures are not needed after verifying them
      // We add our signature to it
      const compressedReport = this._compressReport(report);
      const signature = await this._signCompressedReport(compressedReport);
      this._sentReport = true;

      await this._reportGenNetworkService.sendReport(from, {
        aggregatorAddress: this._reportGenConfig.aggregatorAddress,
        compressedReport,
        signature
      });
    } else {
      await this._completeRound();
    }
  }

  /**
   * Handler for "final" message.
   *
   * @param from - Sender of the message
   * @param attestedReport - Report to broadcast
   * @param aggregatorAddress - Address of the aggregator smart contract
   * @private
   *
   * Start by doing checks on received information:
   *   - Is aggregator address the same as ours ? (We receive message for all aggregators)
   *   - Is sender the leader ?
   *   - Does epoch and round match ours ?
   *   - Did I already sent echo ?
   *   - Is report valid (= have enough valid signatures from oracles)
   *
   * If all of these check pass, broadcast "finalEcho" message
   */
  @useMutex()
  private async _onFinalReceived(
    from: PeerId,
    { attestedReport, aggregatorAddress }: IFinalMessage
  ): Promise<void> {
    if (aggregatorAddress !== this._reportGenConfig.aggregatorAddress) {
      // Silently ignore messages for other aggregators
      return;
    }

    if (from.toString() !== this._leader) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Final received from ${from.toString()}, which is not the leader (${this._leader}), discarding`
      );
      return;
    }

    if (attestedReport.epoch !== this._epoch) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Final received from ${from.toString()} with wrong epoch (${attestedReport.epoch}), discarding`
      );
      return;
    }

    if (attestedReport.round !== this._round) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Final received from ${from.toString()} with wrong round (${attestedReport.round}), discarding`
      );
      return;
    }

    if (this._sentEcho) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Already sent echo, discarding`
      );
      return;
    }

    if (!(await this._verifyAttestedReport(attestedReport))) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Report verification for final from ${from.toString()} failed, discarding`
      );
      return;
    }

    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Sending final echo`
    );

    this._sentEcho = attestedReport;
    await this._reportGenNetworkService.broadcastFinalEcho({
      aggregatorAddress: this._reportGenConfig.aggregatorAddress,
      attestedReport
    });
  }

  /**
   * Handler for "finalEcho" message.
   *
   * @param from - Sender of the message
   * @param attestedReport - Report to broadcast
   * @param aggregatorAddress - Address of the aggregator smart contract
   * @private
   *
   * Start by doing checks on received information:
   *   - Is aggregator address the same as ours ? (We receive message for all aggregators)
   *   - Is sender a valid oracle ?
   *   - Does epoch and round match ours ?
   *   - Did I already received echo from him ?
   *   - Is report valid (= have enough valid signatures from oracles)
   *
   * If all these checks pass:
   *    - Broadcast finalEcho if we didn't do it already
   *    - Give report to TransmitService and end round if enough finalEcho have been received (at least f+1)
   */
  @useMutex()
  private async _onFinalEchoReceived(
    from: PeerId,
    { attestedReport, aggregatorAddress }: IFinalEchoMessage
  ): Promise<void> {
    if (aggregatorAddress !== this._reportGenConfig.aggregatorAddress) {
      // Silently ignore messages for other aggregators
      return;
    }

    if (
      !this._reportGenConfig.oracleAddresses.map((oracle) => oracle.oraclePeerId).includes(from.toString())
    ) {
      this._logger.warn(`Received finalEcho message from unknown oracle: ${from.toString()}`);
      return;
    }

    if (attestedReport.epoch !== this._epoch) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Observation received from ${from.toString()} with wrong epoch (${
          attestedReport.epoch
        }), discarding`
      );
      return;
    }

    if (attestedReport.round !== this._round) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Observation received from ${from.toString()} with wrong round (${
          attestedReport.round
        }), discarding`
      );
      return;
    }

    if (this._receivedEcho.has(from.toString())) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Already received echo from ${from.toString()}, discarding`
      );
      return;
    }

    if (this._completedRound) {
      this._logger.debug(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Received echo from ${from.toString()} but round is already completed, discarding`
      );
      return;
    }

    if (!(await this._verifyAttestedReport(attestedReport))) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Report verification for final echo from ${from.toString()} failed, discarding`
      );
      return;
    }

    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
        this._round
      } - Received final echo from ${from.toString()}`
    );

    this._receivedEcho.set(from.toString(), true);

    if (this._sentEcho === null) {
      this._sentEcho = attestedReport;

      this._logger.log(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Sending final echo`
      );

      await this._reportGenNetworkService.broadcastFinalEcho({
        aggregatorAddress: this._reportGenConfig.aggregatorAddress,
        attestedReport
      });
    }

    const numberOfFinalEchoReceived = [...this._receivedEcho.values()].filter((received) => received).length;

    const f = computeFValueFrom(this._reportGenConfig.oracleAddresses.length);

    if (numberOfFinalEchoReceived > f) {
      this._logger.log(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Enough final echo received (${numberOfFinalEchoReceived}), going to transmit`
      );
      await this._eventHubService.transmit(
        this._reportGenConfig.aggregatorAddress,
        this._reportGenConfig.oracleAddresses,
        attestedReport,
        this._reportGenConfig.alphaPerThousand
      );
      await this._completeRound();
    }
  }

  /**
   * Remove signatures from report
   *
   * @param report - Report with signature
   * @private
   *
   * @returns {ICompressedReport} - Compressed report (without signature)
   */
  private _compressReport(report: IReport): ICompressedReport {
    return {
      epoch: report.epoch,
      round: report.round,
      observations: report.observations.map(({ signature, ...rest }) => ({ ...rest }))
    };
  }

  /**
   * Sign observation using peer private key
   *
   * @param observation - Observation to sign
   * @private
   */
  private async _signObservation(observation: BigNumber): Promise<Uint8Array> {
    const encodedObservation = new TextEncoder().encode(observation.toString());
    return await signData(this._oracleConfig.peerPrivateKey, encodedObservation);
  }

  /**
   * Sign compressed report using tezos private key
   *
   * @param report
   * @private
   */
  private async _signCompressedReport(report: ICompressedReport): Promise<ISignature> {
    const signature = await this._contractService.signCompressedReport(
      this._reportGenConfig.aggregatorAddress,
      this._reportGenConfig.oracleAddresses,
      report.observations,

      report.epoch,
      report.round
    );
    return {
      oracle: this._oracleConfig.tezosAddress,
      signature
    };
  }

  /**
   * Check if report should be given to the transmit service
   *
   * @param report - Report to check
   * @private
   *
   * Steps:
   *  - Fetch last blockchain report
   *  - Check if report has a deviation of as least `alphaPerThousand`
   *  - Check if last report was older than `heartbeatSeconds`
   *
   *  If any of these checks pass, return true, false otherwise
   */
  private async _shouldReport(report: IReport): Promise<boolean> {
    const lastReport = await this._contractService.getLastBlockchainReport(
      this._reportGenConfig.aggregatorAddress
    );

    if ((report.round === 0 && report.epoch === 0) || lastReport === null) {
      return true;
    }

    const secondsMultiplicator = 1000;
    if (
      Date.now() - lastReport.time >
      this._reportGenConfig.heartbeatSeconds.toNumber() * secondsMultiplicator
    ) {
      return true;
    }

    const reportMedian = computeMedian(report);
    const perThousandMultiplicator = 1000;
    const deviationPerThousand = lastReport.price
      .minus(reportMedian)
      .div(lastReport.price)
      .abs()
      .times(perThousandMultiplicator);

    this._logger.debug(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Median: ${reportMedian}, previousMedian: ${lastReport.price}. Deviation(‰): ${deviationPerThousand}`
    );

    if (deviationPerThousand.gt(this._reportGenConfig.alphaPerThousand)) {
      this._logger.log(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Deviation (${deviationPerThousand}) is greater than alpha (${this._reportGenConfig.alphaPerThousand}). Will report`
      );
      return true;
    }
    this._logger.verbose(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Deviation (${deviationPerThousand}) is lower than alpha (${this._reportGenConfig.alphaPerThousand}). Will not report`
    );
    return false;
  }

  /**
   * Complete the round and emit a {@link IEventHubEvents.progress} event
   * @private
   */
  private async _completeRound(): Promise<void> {
    this._completedRound = true;
    this._eventHubService.progress(this._reportGenConfig.aggregatorAddress);
  }

  /**
   * Verify that the report contains as least f signatures
   *
   * @param attestedReport
   * @private
   */
  private async _verifyAttestedReport(attestedReport: IAttestedReport): Promise<boolean> {
    const f = computeFValueFrom(this._reportGenConfig.oracleAddresses.length);

    return await this._contractService.verifyAttestedReport(
      this._reportGenConfig.aggregatorAddress,
      attestedReport,
      this._reportGenConfig.oracleAddresses,
      f
    );
  }

  /**
   * Verify if signature match
   *
   * @param observation - Observation
   * @param signature - Signature with peer private key
   * @param publicKey - Public key of oracle
   * @private
   *
   * @returns If the signature match
   */
  private async _verifyObservationSignature(
    observation: BigNumber,
    signature: Uint8Array,
    publicKey?: Uint8Array
  ): Promise<boolean> {
    if (publicKey === undefined) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - PublicKey undefined for observation ${observation}`
      );
      return false;
    }

    return await verifyData(publicKey, new TextEncoder().encode(observation.toString()), signature);
  }
}
