import { Logger } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
  IAttestedReport,
  ICompressedReport,
  IObserveMessage,
  IReport,
  IReportGenEvents,
  IReportMessage,
  ISignature,
  ReportGenNetworkService
} from './reportgen.network.service.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { EventHubService, IEvents } from '../eventhub.service.js';
import { ContractService } from '../contract.service.js';
import { verifyData } from '../helpers.js';
import { OracleConfig } from '../oracle.config.js';
import { IReportGenConfig } from './reportgen.config.js';

enum Phase {
  Observe,
  Grace,
  Report,
  Final
}

export class ReportGenLeaderService {
  private readonly _logger: Logger = new Logger(ReportGenLeaderService.name);

  private _epoch: number;
  private _leader: string;

  // Current round of the epoch
  private _round: number = 0;

  private _observe: Map<
    string,
    {
      observation: BigNumber;
      signature: Uint8Array;
    }
  > = new Map();
  private _report: Map<
    string,
    {
      report: ICompressedReport;
      signature: ISignature;
    }
  > = new Map();

  private _timerRound: NodeJS.Timeout | null = null;
  private _timerGrace: NodeJS.Timeout | null = null;

  private _phase: Phase | null = null;

  private readonly _timerGraceDurationMiliseconds: number = 2 * 1000;
  private readonly _timerRoundDurationMiliseconds: number = 15 * 1000;

  public constructor(
    private readonly _oracleConfig: OracleConfig,
    private readonly _reportgenNetworkService: ReportGenNetworkService,
    private readonly _eventHubService: EventHubService,
    private readonly _contractService: ContractService,
    private readonly _config: IReportGenConfig
  ) {
    this._epoch = _config.epoch;
    this._leader = _config.leader;
    this._logger.log(`Starting reportgen leader instance for ${this._epoch} with leader ${this._leader}`);
    this._reportgenNetworkService.addListener('observe', this._onObserveHandle);
    this._reportgenNetworkService.addListener('report', this._onReportHandle);
    this._eventHubService.addListener('startepoch', this._onStartEpochHandle);
  }

  public stop(): void {
    this._logger.log(`Stopping reportgen leader instance for ${this._epoch} with leader ${this._leader}`);
    this._stopGraceTimer();
    this._stopRoundTimer();
    this._reportgenNetworkService.removeListener('observe', this._onObserveHandle);
    this._reportgenNetworkService.removeListener('report', this._onReportHandle);
    this._eventHubService.removeListener('startepoch', this._onStartEpochHandle);
  }

  private readonly _onObserveHandle: IReportGenEvents['observe'] = (
    from: PeerId,
    observeMessage: IObserveMessage
  ) => this._onObserve(from, observeMessage);

  private readonly _onReportHandle: IReportGenEvents['report'] = (
    from: PeerId,
    reportMessage: IReportMessage
  ) => this._onReport(from, reportMessage);

  private readonly _onStartEpochHandle: IEvents['startepoch'] = (epoch: number, leader: string) =>
    this.onStartEpoch(epoch, leader);

  public async onStartEpoch(epoch: number, leader: string): Promise<void> {
    if (this._epoch !== epoch || this._leader !== leader) {
      return;
    }
    await this._startRound();
  }

  private async _onTimerRoundTimeout(): Promise<void> {
    await this._startRound();
  }

  private async _startRound(): Promise<void> {
    this._round += 1;
    this._observe = new Map();
    this._report = new Map();
    this._phase = Phase.Observe;
    await this._reportgenNetworkService.broadcastObserveReq(this._round);
    this._restartRoundTimer();
  }

  private async _onObserve(from: PeerId, { observation, round, signature }: IObserveMessage): Promise<void> {
    if (this._oracleConfig.peerId.toString() !== this._leader) {
      this._logger.warn(`_onObserve: I'm not the leader, discarding observation`);
      return;
    }

    if (
      round !== this._round &&
      this._observe.get(from.toString()) === undefined &&
      this._phase !== null &&
      ![Phase.Observe, Phase.Grace].includes(this._phase)
    ) {
      this._logger.warn(`_onObserve: Discarding observation`);
      return;
    }

    if (!(await this._verifyObservationSignature(observation, signature, from.publicKey))) {
      this._logger.warn(`_onObserve: Invalid Signature for node: ${from.publicKey}, discarding observation`);
      return;
    }

    this._observe.set(from.toString(), {
      observation,
      signature
    });

    const numberOfObservation = [...this._observe.values()].length;

    const f = await this._contractService.getFValue();
    if (numberOfObservation === 2 * f + 1) {
      this._restartGraceTimer();
      this._phase = Phase.Grace;
    }
  }

  private async _onGraceTimerTimeout(): Promise<void> {
    if (this._phase !== Phase.Grace) {
      return;
    }

    const assembledReport = this._assembleReport();
    await this._reportgenNetworkService.broadcastReportReq(assembledReport);
    this._phase = Phase.Report;
  }

  private async _onReport(from: PeerId, { compressedReport, signature }: IReportMessage): Promise<void> {
    if (this._oracleConfig.peerId.toString() !== this._leader) {
      this._logger.warn(`_onReport: I'm not the leader, discarding report`);
      return;
    }

    if (
      compressedReport.round !== this._round &&
      this._report.get(from.toString()) === undefined &&
      this._phase !== null &&
      this._phase !== Phase.Report
    ) {
      this._logger.warn(`_onReport: discarding report`);
      return;
    }

    if (!(await this._verifyReportSignature(compressedReport, signature))) {
      this._logger.warn(`_onReport: signature did not match, discarding report`);
      return;
    }

    this._report.set(from.toString(), {
      report: compressedReport,
      signature
    });

    const numberOfReports = [...this._report.values()].length;

    const f = await this._contractService.getFValue();
    if (numberOfReports < f) {
      this._logger.debug(`_onReport: Not enough report yet (got ${numberOfReports}, need ${f})`);
      return;
    }

    const attestedReport: IAttestedReport = {
      epoch: this._epoch,
      round: this._round,
      observations: compressedReport.observations,
      signatures: [...this._report.values()].map((report) => report.signature)
    };

    await this._reportgenNetworkService.broadcastFinal(attestedReport);
    this._phase = Phase.Final;
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

  private async _verifyReportSignature(report: ICompressedReport, signature: ISignature): Promise<boolean> {
    return await this._contractService.verifyReportSignature(report, signature);
  }

  private _stopGraceTimer(): void {
    if (this._timerGrace !== null) {
      clearTimeout(this._timerGrace);
    }
  }

  private _restartGraceTimer(): void {
    this._stopGraceTimer();
    this._timerGrace = setTimeout(() => this._onGraceTimerTimeout(), this._timerGraceDurationMiliseconds);
  }

  private _stopRoundTimer(): void {
    if (this._timerRound !== null) {
      clearTimeout(this._timerRound);
    }
  }

  private _restartRoundTimer(): void {
    this._stopRoundTimer();
    this._timerRound = setTimeout(() => this._onTimerRoundTimeout(), this._timerRoundDurationMiliseconds);
  }

  private _assembleReport(): IReport {
    return {
      epoch: this._epoch,
      round: this._round,
      observations: [...this._observe.entries()]
        .map(([oracle, observation]) => ({
          oracle,
          price: observation.observation,
          signature: observation.signature
        }))
        .sort((a, b) => a.price.minus(b.price).toNumber())
    };
  }
}
