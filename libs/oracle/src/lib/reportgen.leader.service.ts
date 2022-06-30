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
import { SmartContractMockService } from './smartcontract.mock.service.js';

enum Phase {
  Observe,
  Grace,
  Report,
  Final
}

@Injectable()
export class ReportGenLeaderService implements OnModuleInit {
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
      signature: Uint8Array;
    }
  > = new Map();

  private _timerRound: NodeJS.Timeout | null = null;
  private _timerGrace: NodeJS.Timeout | null = null;

  private _phase: Phase | null = null;

  private readonly _timerGraceDurationMiliseconds: number = 2 * 1000;
  private readonly _timerRoundDurationMiliseconds: number = 15 * 1000;

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _reportgenNetworkService: ReportGenNetworkService,
    private readonly _eventHubService: EventHubService,
    private readonly _smartContractService: SmartContractMockService
  ) {}

  public async onModuleInit(): Promise<void> {
    this._reportgenNetworkService.on('observe', (from, { observation, round, signature }) =>
      this._onObserve(from, round, observation, signature)
    );
    this._reportgenNetworkService.on('report', (from, { round, compressedReport, signature }) =>
      this._onReport(from, round, compressedReport, signature)
    );
    this._eventHubService.on('startepoch', (epoch, leader) => this.onStartEpoch(epoch, leader));
  }

  public async onStartEpoch(epoch: number, leader: string): Promise<void> {
    // TODO: This is not in ocr paper spec, but necessary with the current implementation, this set state to blank state
    this._round = 0;
    this._epoch = epoch;
    this._leader = leader;
    this._stopGraceTimer();
    this._stopRoundTimer();
    this._observe = new Map();
    this._report = new Map();
    this._phase = Phase.Observe;

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

    if (this._config.peerId.toString() !== this._leader) {
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

    const f = await this._smartContractService.getFValue();
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

    if (this._config.peerId.toString() !== this._leader) {
      this._logger.warn(`_onReport: I'm not the leader, discarding report`);
      return;
    }

    if (
      round !== this._round &&
      this._report.get(from.toString()) === undefined &&
      this._phase !== null &&
      this._phase !== Phase.Report
    ) {
      this._logger.warn(`_onReport: discarding report`);
      return;
    }

    if (!this._verifyReportSignature(report, signature)) {
      this._logger.warn(`_onReport: signature did not match, discarding report`);
      return;
    }

    this._report.set(from.toString(), {
      report,
      signature
    });

    const numberOfReports = [...this._report.values()].length;

    const f = await this._smartContractService.getFValue();
    if (numberOfReports < f) {
      this._logger.debug(`_onReport: Not enough report yet (got ${numberOfReports}, need ${f})`);
      return;
    }

    const attestedReport: IAttestedReport = {
      observations: report.observations,
      signatures: [...this._report.values()].map((report) => report.signature)
    };

    await this._reportgenNetworkService.broadcastFinal(round, attestedReport);
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
