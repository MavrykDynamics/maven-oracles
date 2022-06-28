import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from './oracle.config.js';
import BigNumber from 'bignumber.js';
import {
  IAttestedReport,
  ICompressedReport,
  IReport,
  ReportGenNetworkService
} from './reportgen.network.service.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { EventHubService } from './eventhub.service.js';

enum Phase {
  Observe,
  Grace,
  Report,
  Final
}

@Injectable()
export class ReportGenLeaderService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(ReportGenLeaderService.name);

  // Current round of the epoch
  private _round: number = 0;

  private _observe: Map<
    string,
    {
      observation: BigNumber;
      signature: string;
    }
  > = new Map();
  private _report: Map<
    string,
    {
      report: IReport;
      signature: string;
    }
  > = new Map();

  private _timerRound: NodeJS.Timeout | null = null;
  private _timerGrace: NodeJS.Timeout | null = null;

  private _phase: Phase | null = null;

  // Maximum number of faulty oracles
  private _f: number = 2; // TODO: let this be dynamically set to 1/3 of number of oracles

  private readonly _timerGraceDurationMiliseconds = 2 * 1000;
  private readonly _timerRoundDurationMiliseconds = 15 * 1000;

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _reportgenNetworkService: ReportGenNetworkService,
    private readonly _eventHubService: EventHubService
  ) {}

  public async onModuleInit(): Promise<void> {
    this._reportgenNetworkService.on('observe', (from, { observation, round, signature }) =>
      this._onObserve(from, round, observation, signature)
    );
    this._reportgenNetworkService.on('report', (from, { round, signature, compressedReport }) =>
      this._onReport(from, round, compressedReport, signature)
    );
    this._eventHubService.on('startepoch', (epoch, leader) => this.onStartEpoch());
  }

  public async onStartEpoch(): Promise<void> {
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

  private async _onObserve(
    from: PeerId,
    round: number,
    observation: BigNumber,
    signature: string
  ): Promise<void> {
    // TODO: verify signature
    // TODO: Check if i'm the leader
    if (
      round !== this._round &&
      this._observe.get(from.toString()) === undefined &&
      this._phase !== null &&
      ![Phase.Observe, Phase.Grace].includes(this._phase)
    ) {
      return;
    }

    if (!this._verifyObservationSignature(observation, signature)) {
      return;
    }

    this._observe.set(from.toString(), {
      observation,
      signature
    });

    const numberOfObservation = [...this._observe.values()].length;

    if (numberOfObservation === 2 * this._f + 1) {
      this._restartGraceTimer();
      this._phase = Phase.Grace;
    }
  }

  private async _onGraceTimerTimeout(): Promise<void> {
    if (this._phase !== Phase.Grace) {
      return;
    }

    const assembledReport = this._assembleReport();
    await this._reportgenNetworkService.broadcastReportReq(this._round, assembledReport);
    this._phase = Phase.Report;
  }

  private async _onReport(
    from: PeerId,
    round: number,
    report: ICompressedReport,
    signature: string
  ): Promise<void> {
    // TODO: verify signature
    // TODO: Check if i'm the leader
    if (
      round !== this._round &&
      this._report.get(from.toString()) === undefined &&
      this._phase !== null &&
      this._phase !== Phase.Report
    ) {
      return;
    }

    if (!this._verifyReportSignature(report, signature)) {
      return;
    }

    this._report.set(from.toString(), {
      report,
      signature
    });

    const numberOfReports = [...this._report.values()].length;

    if (numberOfReports < this._f) {
      return;
    }

    // TODO: generate attested report
    const O: IAttestedReport = {
      epoch: 0, // TODO: get real epoch,
      round: 0
    };

    await this._reportgenNetworkService.broadcastFinal(round, O);
    this._phase = Phase.Final;
  }

  private _verifyObservationSignature(observation: BigNumber, signature: string): boolean {
    return true;
  }

  private _verifyReportSignature(report: ICompressedReport, signature: string): boolean {
    return true;
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
    // TODO: implement
    return {};
  }
}
