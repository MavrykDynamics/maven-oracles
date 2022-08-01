import { Logger } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { ReportGenNetworkService } from './reportgen.network.service.js';
import {
  IAttestedReport,
  ICompressedReport,
  IObserveMessage,
  IReport,
  IReportGenEvents,
  IReportMessage,
  ISignature
} from './reportgen.types.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { EventHubService, IEventHubEvents } from '../event-hub';
import { ContractService } from '../contract/contract.service.js';
import { verifyData } from './helpers.js';
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
    private readonly _reportGenConfig: IReportGenConfig
  ) {
    this._epoch = _reportGenConfig.epoch;
    this._leader = _reportGenConfig.leader;
    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch} Starting reportgen leader instance with leader ${this._leader}`
    );
    this._reportgenNetworkService.addListener('observe', this._onObserveHandle);
    this._reportgenNetworkService.addListener('report', this._onReportHandle);
    this._eventHubService.addListener('startepoch', this._onStartEpochHandle);
  }

  public stop(): void {
    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch} Stopping reportgen leader instance`
    );
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

  private readonly _onStartEpochHandle: IEventHubEvents['startepoch'] = (
    aggregatorAddress: string,
    epoch: number,
    leader: string
  ) => this.onStartEpoch(aggregatorAddress, epoch, leader);

  public async onStartEpoch(aggregatorAddress: string, epoch: number, leader: string): Promise<void> {
    if (aggregatorAddress !== this._reportGenConfig.aggregatorAddress) {
      return;
    }
    if (this._epoch !== epoch || this._leader !== leader) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Epoch/leader mismatch: received ${epoch}/${leader}`
      );
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
    await this._reportgenNetworkService.broadcastObserveReq({
      aggregatorAddress: this._reportGenConfig.aggregatorAddress,
      round: this._round
    });
    this._restartRoundTimer();
  }

  private async _onObserve(
    from: PeerId,
    { observation, epoch, round, signature, aggregatorAddress }: IObserveMessage
  ): Promise<void> {
    if (aggregatorAddress !== this._reportGenConfig.aggregatorAddress) {
      // Silently ignore messages for other aggregators
      return;
    }

    if (epoch !== this._epoch) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Observation received from ${from.toString()} with wrong epoch (${epoch}), discarding`
      );
      return;
    }

    if (round !== this._round) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Observation received from ${from.toString()} with wrong round (${round}), discarding`
      );
      return;
    }

    if (this._oracleConfig.peerId.toString() !== this._leader) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - I'm not the leader, discarding observation`
      );
      return;
    }

    if (this._observe.has(from.toString())) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Already received observation from ${from.toString()}: ${this._observe.get(
          from.toString()
        )}, discarding`
      );
      return;
    }

    if (this._phase === null || ![Phase.Observe, Phase.Grace].includes(this._phase)) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Observation received from ${from.toString()} during wrong phase (${
          this._phase
        }), discarding observation`
      );
      return;
    }

    if (!(await this._verifyObservationSignature(observation, signature, from.publicKey))) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Invalid Signature for node: ${from.publicKey}, discarding observation`
      );
      return;
    }

    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
        this._round
      } - Saving observation from ${from.toString()}: ${observation}`
    );

    this._observe.set(from.toString(), {
      observation,
      signature
    });

    const numberOfObservation = [...this._observe.values()].length;

    const f = await this._contractService.getFValue(this._reportGenConfig.aggregatorAddress);
    if (numberOfObservation === 2 * f + 1) {
      this._logger.log(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Enough observations have been collected, starting grace period`
      );

      this._restartGraceTimer();
      this._phase = Phase.Grace;
    }
  }

  private async _onGraceTimerTimeout(): Promise<void> {
    if (this._phase !== Phase.Grace) {
      return;
    }

    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Grace period finished, assembling report`
    );

    const assembledReport = this._assembleReport();
    await this._reportgenNetworkService.broadcastReportReq({
      aggregatorAddress: this._reportGenConfig.aggregatorAddress,
      report: assembledReport
    });
    this._phase = Phase.Report;
  }

  private async _onReport(
    from: PeerId,
    { compressedReport, signature, aggregatorAddress }: IReportMessage
  ): Promise<void> {
    if (aggregatorAddress !== this._reportGenConfig.aggregatorAddress) {
      // Silently ignore messages for other aggregators
      return;
    }

    if (this._oracleConfig.peerId.toString() !== this._leader) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Received report from ${from.toString()}, but I'm not the leader, discarding`
      );
      return;
    }

    if (compressedReport.epoch !== this._epoch) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Report received from ${from.toString()} with wrong epoch (${compressedReport.epoch}), discarding`
      );
      return;
    }

    if (compressedReport.round !== this._round) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Report received from ${from.toString()} with wrong round (${compressedReport.round}), discarding`
      );
      return;
    }

    if (this._report.has(from.toString())) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Already received report from ${from.toString()}: ${this._observe.get(
          from.toString()
        )}, discarding`
      );
      return;
    }

    if (this._phase === null || this._phase !== Phase.Report) {
      // This should occur very often since we only need f report before transmitting

      this._logger.debug(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Report received from ${from.toString()} during wrong phase (${this._phase}), discarding`
      );
      return;
    }

    if (!(await this._verifyReportSignature(compressedReport, signature))) {
      this._logger.warn(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
          this._round
        } - Report from ${from.toString()} signature did not match, discarding report`
      );
      return;
    }

    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${
        this._round
      } - Saving report from ${from.toString()}`
    );

    this._report.set(from.toString(), {
      report: compressedReport,
      signature
    });

    const numberOfReports = [...this._report.values()].length;

    const f = await this._contractService.getFValue(this._reportGenConfig.aggregatorAddress);

    if (numberOfReports <= f) {
      this._logger.debug(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Not enough report yet (got ${numberOfReports}, need ${f})`
      );
      return;
    }

    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Received enough report, starting final phase`
    );

    const attestedReport: IAttestedReport = {
      epoch: this._epoch,
      round: this._round,
      observations: compressedReport.observations,
      signatures: [...this._report.values()].map((report) => report.signature)
    };

    await this._reportgenNetworkService.broadcastFinal({
      aggregatorAddress: this._reportGenConfig.aggregatorAddress,
      attestedReport
    });

    this._phase = Phase.Final;
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

  private async _verifyReportSignature(report: ICompressedReport, signature: ISignature): Promise<boolean> {
    return await this._contractService.verifyReportSignature(
      this._reportGenConfig.aggregatorAddress,
      report,
      signature
    );
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
        .sort((a, b) => a.oracle.localeCompare(b.oracle))
    };
  }
}
