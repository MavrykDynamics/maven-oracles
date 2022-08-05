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
import { createFromJSON } from '@libp2p/peer-id-factory';
import { IReportGenConfig } from './reportgen.config.js';
import { computeFValueFrom } from '../pacemaker/helpers.js';

export class ReportGenFollowerService {
  private readonly _logger: Logger = new Logger(ReportGenFollowerService.name);

  private readonly _epoch: number;
  private readonly _leader: string;

  // Current round of the epoch
  private _round: number = 0;
  private _sentEcho: IAttestedReport | null = null;
  private _sentReport: boolean = false;
  private _completedRound: boolean = false;
  private _receivedEcho: Map<string, boolean> = new Map();

  private readonly _roundMax: number = 3; // 3 - 20 recommended by OCR white paper

  public constructor(
    private readonly _oracleConfig: OracleConfig,
    private readonly _reportgenNetworkService: ReportGenNetworkService,
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
    this._reportgenNetworkService.addListener('observeReq', this._onObserveReqReceivedHandler);
    this._reportgenNetworkService.addListener('reportReq', this._onReportReqReceivedHandler);
    this._reportgenNetworkService.addListener('final', this._onFinalReceivedHandler);
    this._reportgenNetworkService.addListener('finalEcho', this._onFinalEchoReceivedHandler);
  }

  public stop(): void {
    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}  Stopping reportgen follower instance`
    );
    this._reportgenNetworkService.removeListener('observeReq', this._onObserveReqReceivedHandler);
    this._reportgenNetworkService.removeListener('reportReq', this._onReportReqReceivedHandler);
    this._reportgenNetworkService.removeListener('final', this._onFinalReceivedHandler);
    this._reportgenNetworkService.removeListener('finalEcho', this._onFinalEchoReceivedHandler);
  }

  private readonly _onObserveReqReceivedHandler: IReportGenEvents['observeReq'] = (
    from: PeerId,
    observeReqMessage: IObserveReqMessage
  ) => this.onObserveReqReceived(from, observeReqMessage);

  private readonly _onReportReqReceivedHandler: IReportGenEvents['reportReq'] = (
    from: PeerId,
    reportReqMessage: IReportReqMessage
  ) => this.onReportReqReceived(from, reportReqMessage);

  private readonly _onFinalReceivedHandler: IReportGenEvents['final'] = (
    from: PeerId,
    finalMessage: IFinalMessage
  ) => this.onFinalReceived(from, finalMessage);

  private readonly _onFinalEchoReceivedHandler: IReportGenEvents['finalEcho'] = (
    from: PeerId,
    finalEchoMessage: IFinalEchoMessage
  ) => this.onFinalEchoReceived(from, finalEchoMessage);

  public async onObserveReqReceived(from: PeerId, observeReqMessage: IObserveReqMessage): Promise<void> {
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
    if (!(this._round < observeReqMessage.round && observeReqMessage.round <= this._roundMax + 1)) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Observation request invalid round number (${observeReqMessage.round}), discarding request`
      );
      return;
    }

    this._round = observeReqMessage.round;

    if (this._round > this._roundMax) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Observation request round (${this._round}) is over max round number ${this._roundMax}, discarding request and changing leader`
      );
      this._eventHubService.changeleader(this._reportGenConfig.aggregatorAddress);
      return;
    }

    this._sentEcho = null;
    this._sentReport = false;
    this._completedRound = false;
    this._receivedEcho = new Map();

    const decimals: BigNumber = (
      await this._contractService.getBlockchainConfig(this._reportGenConfig.aggregatorAddress)
    ).decimals;

    const observation = await this._priceService.getPrice(decimals, this._reportGenConfig.aggregatorPair);

    const signature = await this._signObservation(observation);

    await this._reportgenNetworkService.sendObserve(from, {
      aggregatorAddress: this._reportGenConfig.aggregatorAddress,
      epoch: this._epoch,
      round: observeReqMessage.round,
      observation,
      signature
    });
  }

  public async onReportReqReceived(
    from: PeerId,
    { report, aggregatorAddress }: IReportReqMessage
  ): Promise<void> {
    if (aggregatorAddress !== this._reportGenConfig.aggregatorAddress) {
      // Silently ignore messages for other aggregators
      return;
    }

    // a.oracle.localeCompare(b.oracle)
    const isReportSorted = report.observations.every(
      (v, i, a) => i === 0 || report.observations[i - 1].oracle.localeCompare(v.oracle) <= 0
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
        } - Report received from ${from.toString()} is has not enough observation from different oracles, discarding`
      );
      return;
    }

    const signaturesChecks = await Promise.all(
      report.observations.map(async (ob) => {
        const pubKey = await this._reportgenNetworkService.getPublicKeyOfPeerId(
          await createFromJSON({
            id: ob.oracle
          })
        );
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
      const compressedReport = this._compressReport(report);
      const signature = await this._signCompressedReport(compressedReport);
      this._sentReport = true;

      await this._reportgenNetworkService.sendReport(from, {
        aggregatorAddress: this._reportGenConfig.aggregatorAddress,
        compressedReport,
        signature
      });
    } else {
      await this._completeRound();
    }
  }

  public async onFinalReceived(
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
    await this._reportgenNetworkService.broadcastFinalEcho({
      aggregatorAddress: this._reportGenConfig.aggregatorAddress,
      attestedReport
    });
  }

  public async onFinalEchoReceived(
    from: PeerId,
    { attestedReport, aggregatorAddress }: IFinalEchoMessage
  ): Promise<void> {
    if (aggregatorAddress !== this._reportGenConfig.aggregatorAddress) {
      // Silently ignore messages for other aggregators
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

      await this._reportgenNetworkService.broadcastFinalEcho({
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
        attestedReport
      );
      await this._completeRound();
    }
  }

  private _compressReport(report: IReport): ICompressedReport {
    return {
      epoch: report.epoch,
      round: report.round,
      observations: report.observations.map(({ signature, ...rest }) => ({ ...rest }))
    };
  }

  private async _signObservation(observation: BigNumber): Promise<Uint8Array> {
    const encodedObservation = new TextEncoder().encode(observation.toString());
    return await signData(this._oracleConfig.peerPrivateKey, encodedObservation);
  }

  private async _signCompressedReport(report: ICompressedReport): Promise<ISignature> {
    const signature = await this._contractService.signCompressedReport(
      this._reportGenConfig.aggregatorAddress,
      this._reportGenConfig.oracleAddresses,
      report.observations,
      this._oracleConfig.tezosSecretKey,
      report.epoch,
      report.round
    );
    return {
      oracle: this._oracleConfig.tezosAddress,
      signature
    };
  }

  private async _shouldReport(report: IReport): Promise<boolean> {
    const lastReport = await this._contractService.getLastBlockchainReport(
      this._reportGenConfig.aggregatorAddress
    );

    if ((report.round === 0 && report.epoch === 0) || lastReport === null) {
      return true;
    }

    if (Date.now() - lastReport.time > this._reportGenConfig.heartbeatSeconds.toNumber() * 1000) {
      return true;
    }

    const reportMedian = computeMedian(report);
    const deviation = lastReport.price.minus(reportMedian).div(lastReport.price).abs();

    this._logger.debug(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Median: ${reportMedian}, previousMedian: ${lastReport.price}. Deviation: ${deviation}`
    );

    if (lastReport.price.minus(reportMedian).div(lastReport.price).abs().gt(this._reportGenConfig.alpha)) {
      this._logger.log(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Deviation (${deviation}) is greater than alpha (${this._reportGenConfig.alpha}). Will report`
      );
      return true;
    }
    this._logger.verbose(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Deviation (${deviation}) is lower than alpha (${this._reportGenConfig.alpha}). Will not report`
    );
    return false;
  }

  private async _completeRound(): Promise<void> {
    this._completedRound = true;
    this._eventHubService.progress(this._reportGenConfig.aggregatorAddress);
  }

  private async _verifyAttestedReport(attestedReport: IAttestedReport): Promise<boolean> {
    const f = computeFValueFrom(this._reportGenConfig.oracleAddresses.length);

    return await this._contractService.verifyAttestedReport(
      this._reportGenConfig.aggregatorAddress,
      attestedReport,
      this._reportGenConfig.oracleAddresses,
      f
    );
  }

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
