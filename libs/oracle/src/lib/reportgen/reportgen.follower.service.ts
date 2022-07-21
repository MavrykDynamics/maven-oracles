import { Logger } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import BigNumber from 'bignumber.js';
import {
  IAttestedReport,
  ICompressedReport,
  IFinalEchoMessage,
  IFinalMessage,
  IObserveReqMessage,
  IReport,
  IReportGenEvents,
  IReportReqMessage,
  ISignature,
  ReportGenNetworkService
} from './reportgen.network.service.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { EventHubService } from '../eventhub.service.js';
import { computeMedian, signData, verifyData } from '../helpers.js';
import { ContractService } from '../contract.service.js';
import { PriceService } from '../price.service.js';
import { createFromJSON } from '@libp2p/peer-id-factory';
import { IReportGenConfig } from './reportgen.config.js';

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

    this._logger.log(`Starting reportgen follower instance for ${this._epoch} with leader ${this._leader}`);
    this._reportgenNetworkService.addListener('observeReq', this._onObserveReqReceivedHandler);
    this._reportgenNetworkService.addListener('reportReq', this._onReportReqReceivedHandler);
    this._reportgenNetworkService.addListener('final', this._onFinalReceivedHandler);
    this._reportgenNetworkService.addListener('finalEcho', this._onFinalEchoReceivedHandler);
  }

  public stop(): void {
    this._logger.log(`Stopping reportgen follower instance for ${this._epoch} with leader ${this._leader}`);
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
        'onObserveReqReceived: Observation request received from someone else than leader, discarding request'
      );
      return;
    }
    if (!(this._round < observeReqMessage.round && observeReqMessage.round <= this._roundMax + 1)) {
      this._logger.warn('onObserveReqReceived: Observation request invalid round number, discarding request');
      return;
    }

    this._round = observeReqMessage.round;

    if (this._round > this._roundMax) {
      this._logger.warn(
        'onObserveReqReceived: Observation request has reached max round number, discarding request'
      );
      this._eventHubService.changeleader();
      return;
    }

    this._sentEcho = null;
    this._sentReport = false;
    this._completedRound = false;
    this._receivedEcho = new Map();

    // TODO: fetch decimals from smart contract
    // const decimals: BigNumber = (
    //   await this._contractService._getBlockchainConfig(this._config.aggregatorAddress)
    // ).decimals;

    const decimals = new BigNumber(2);

    const pair: [string, string] = ['USD', 'XTZ']; // TODO: get from blockchain from factory

    const observation = await this._priceService.getPrice(decimals, pair);

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

    const isReportSorted = report.observations.every(
      (v, i, a) => i === 0 || report.observations[i - 1].price.lte(v.price)
    );

    if (!isReportSorted) {
      this._logger.warn('onReportReqReceived: Report is not sorted, discarding report request');
      return;
    }

    const distinctOracleObservations = [...new Set(report.observations.map((ob) => ob.oracle))];

    const f = await this._contractService.getFValue();
    if (distinctOracleObservations.length < f * 2 + 1) {
      this._logger.warn('onReportReqReceived: Report has not enough observation from different oracles');
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
      this._logger.warn('onReportReqReceived: Signature check failed');
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
        'onFinalReceived: Observation request received from someone else than leader, discarding request'
      );
      return;
    }
    if (attestedReport.round !== this._round || this._sentEcho) {
      return;
    }

    if (!(await this._verifyAttestedReport(attestedReport))) {
      return;
    }

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

    if (
      attestedReport.round !== this._round ||
      this._receivedEcho.get(from.toString()) ||
      this._completedRound
    ) {
      return;
    }

    if (!(await this._verifyAttestedReport(attestedReport))) {
      return;
    }

    this._receivedEcho.set(from.toString(), true);

    if (this._sentEcho === null) {
      this._sentEcho = attestedReport;
      await this._reportgenNetworkService.broadcastFinalEcho({
        aggregatorAddress: this._reportGenConfig.aggregatorAddress,
        attestedReport
      });
    }

    const numberOfFinalEchoReceived = [...this._receivedEcho.values()].filter((received) => received).length;

    const f = await this._contractService.getFValue();
    if (numberOfFinalEchoReceived > f) {
      this._logger.log(`$$$ - YOUPI ${this._epoch}/${this._round} - $$$`);
      await this._eventHubService.transmit(this._epoch, this._round, attestedReport);
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
    const lastReport = await this._contractService._getLastBlockchainReport(
      this._reportGenConfig.aggregatorAddress
    );

    if ((report.round === 0 && report.epoch === 0) || lastReport === null) {
      return true;
    }

    if (Date.now() - lastReport.time > this._reportGenConfig.heartbeatSeconds.toNumber() * 1000) {
      return true;
    }

    const reportMedian = computeMedian(report);

    this._logger.log(
      `_shouldReport: report ${report.epoch}/${report.round} median: ${reportMedian}, previousMedian: ${
        lastReport.price
      }. Deviation: ${lastReport.price.minus(reportMedian).div(lastReport.price).abs()}`
    );

    if (lastReport.price.minus(reportMedian).div(lastReport.price).abs().gt(this._reportGenConfig.alpha)) {
      this._logger.log(`_shouldReport: will report`);
      return true;
    }
    this._logger.log(`_shouldReport: will not report`);
    return false;
  }

  private async _completeRound(): Promise<void> {
    this._completedRound = true;
    this._eventHubService.progress();
  }

  private async _verifyAttestedReport(attestedReport: IAttestedReport): Promise<boolean> {
    return await this._contractService.verifyAttestedReport(attestedReport);
  }

  private async _verifyObservationSignature(
    observation: BigNumber,
    signature: Uint8Array,
    publicKey?: Uint8Array
  ): Promise<boolean> {
    if (publicKey === undefined) {
      this._logger.warn('_verifyObservationSignature: publicKey undefined');
      return false;
    }

    return await verifyData(publicKey, new TextEncoder().encode(observation.toString()), signature);
  }
}
