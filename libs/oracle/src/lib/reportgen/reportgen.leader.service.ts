import { Logger } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { ReportGenNetworkService } from './reportgen.network.service.js';
import {
  IAttestedReport,
  ICompressedReport,
  IObserveMessage,
  IReport,
  IReportGenEvents,
  IReportGenLeaderState,
  IReportMessage,
  ISignature,
  Phase
} from './reportgen.types.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { EventHubService, IEventHubEvents } from '../event-hub';
import { ContractService } from '../contract/index.js';
import { verifyData } from './helpers.js';
import { OracleConfig } from '../oracle.config.js';
import { IReportGenConfig } from './reportgen.config.js';
import { computeFValueFrom } from '../pacemaker/helpers.js';
import { Timer } from '../pacemaker/timer.js';
import { useMutex } from '../helpers/useMutex.js';
import { Mutex } from 'async-mutex';

export class ReportGenLeaderService {
  private readonly _logger: Logger = new Logger(ReportGenLeaderService.name);

  private readonly _mutex = new Mutex();

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

  private _phase: Phase | null = null;

  private readonly _timerGraceDurationMiliseconds: number = 2 * 1000;
  private readonly _timerRoundDurationMiliseconds: number = 15 * 1000;

  private _timerRound: Timer = new Timer(
    this._onTimerRoundTimeout.bind(this),
    this._timerRoundDurationMiliseconds
  );

  private _timerGrace: Timer = new Timer(
    this._onGraceTimerTimeout.bind(this),
    this._timerGraceDurationMiliseconds
  );

  private readonly _onObserveHandle: IReportGenEvents['observe'] = this._onObserve.bind(this);
  private readonly _onReportHandle: IReportGenEvents['report'] = this._onReport.bind(this);
  private readonly _onStartEpochHandle: IEventHubEvents['startepoch'] = this._onStartEpoch.bind(this);

  public constructor(
    private readonly _oracleConfig: OracleConfig,
    private readonly _reportGenNetworkService: ReportGenNetworkService,
    private readonly _eventHubService: EventHubService,
    private readonly _contractService: ContractService,
    private readonly _reportGenConfig: IReportGenConfig
  ) {
    this._epoch = _reportGenConfig.epoch;
    this._leader = _reportGenConfig.leader;
    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch} Starting reportgen leader instance with leader ${this._leader}`
    );
    this._reportGenNetworkService.addListener('observe', this._onObserveHandle);
    this._reportGenNetworkService.addListener('report', this._onReportHandle);
    this._eventHubService.addListener('startepoch', this._onStartEpochHandle);
  }

  public stop(): void {
    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch} Stopping reportgen leader instance`
    );
    this._timerGrace.stop();
    this._timerRound.stop();
    this._reportGenNetworkService.removeListener('observe', this._onObserveHandle);
    this._reportGenNetworkService.removeListener('report', this._onReportHandle);
    this._eventHubService.removeListener('startepoch', this._onStartEpochHandle);
  }

  @useMutex()
  private async _onStartEpoch(aggregatorAddress: string, epoch: number, leader: string): Promise<void> {
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

  @useMutex()
  private async _onTimerRoundTimeout(): Promise<void> {
    await this._startRound();
  }

  private async _startRound(): Promise<void> {
    this._round += 1;
    this._observe = new Map();
    this._report = new Map();
    this._phase = Phase.Observe;
    await this._reportGenNetworkService.broadcastObserveReq({
      aggregatorAddress: this._reportGenConfig.aggregatorAddress,
      round: this._round
    });
    this._timerRound.restart();
  }

  @useMutex()
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

    const f = computeFValueFrom(this._reportGenConfig.oracleAddresses.length);
    if (numberOfObservation === 2 * f + 1) {
      this._logger.log(
        `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Enough observations have been collected, starting grace period`
      );

      this._timerGrace.restart();
      this._phase = Phase.Grace;
    }
  }

  @useMutex()
  private async _onGraceTimerTimeout(): Promise<void> {
    if (this._phase !== Phase.Grace) {
      return;
    }

    this._logger.log(
      `${this._reportGenConfig.aggregatorAddress}/${this._epoch}/${this._round} - Grace period finished, assembling report`
    );

    const assembledReport = this._assembleReport();
    await this._reportGenNetworkService.broadcastReportReq({
      aggregatorAddress: this._reportGenConfig.aggregatorAddress,
      report: assembledReport
    });
    this._phase = Phase.Report;
  }

  @useMutex()
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

    const f = computeFValueFrom(this._reportGenConfig.oracleAddresses.length);

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

    await this._reportGenNetworkService.broadcastFinal({
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
      this._reportGenConfig.oracleAddresses,
      report,
      signature
    );
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

  public getState(): IReportGenLeaderState {
    return {
      epoch: this._epoch,
      leader: this._leader,
      round: this._round,
      observe: this._observe,
      reports: this._report,
      phase: this._phase
    };
  }
}
