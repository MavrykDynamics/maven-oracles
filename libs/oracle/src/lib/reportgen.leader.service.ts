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
import { verifyData } from './helpers.js';
import { createEd25519PeerId } from '@libp2p/peer-id-factory';

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
      signature: Uint8Array;
    }
  > = new Map();
  private _report: Map<
    string,
    {
      report: ICompressedReport;
      signature: Uint8Array;
    }
  > = new Map();

  private _timerRound: NodeJS.Timeout | null = null;
  private _timerGrace: NodeJS.Timeout | null = null;

  private _phase: Phase | null = null;

  // Maximum number of faulty oracles
  private _f: number = 2; // TODO: let this be dynamically set to 1/3 of number of oracles

  private readonly _timerGraceDurationMiliseconds: number = 2 * 1000;
  private readonly _timerRoundDurationMiliseconds: number = 15 * 1000;

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _reportgenNetworkService: ReportGenNetworkService,
    private readonly _eventHubService: EventHubService
  ) {}

  public async onModuleInit(): Promise<void> {
    this._reportgenNetworkService.on('observe', (from, { observation, round, signature }) =>
      this._onObserve(from, round, observation, signature)
    );
    this._reportgenNetworkService.on('report', (from, { round, compressedReport, signature }) =>
      this._onReport(from, round, compressedReport, signature)
    );
    this._eventHubService.on('startepoch', (epoch, leader) => this.onStartEpoch());
  }

  private async _initialize() {
    this._round = 0;
    this._observe = new Map();
    this._report = new Map();
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
    signature: Uint8Array
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

    if (!this._verifyObservationSignature(observation, signature, from.publicKey)) {
      this._logger.warn(`Invalid Signature for node: ${from.publicKey}`)
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
    signature: Uint8Array
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
      observations: report.observations,
      signatures: [...this._report.values()].map((report) => report.signature)
    };

    await this._reportgenNetworkService.broadcastFinal(round, O);
    this._phase = Phase.Final;
  }

  private async _verifyObservationSignature(observation: BigNumber, signature: Uint8Array, publicKey?: Uint8Array): Promise<boolean> {
    if (publicKey === undefined){
      throw new Error("publicKey undefined")
    }
    return await verifyData(publicKey, new TextEncoder().encode(observation.toString()), signature);
  }

  private _verifyReportSignature(report: ICompressedReport, signature: Uint8Array): boolean {
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
    return {
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
