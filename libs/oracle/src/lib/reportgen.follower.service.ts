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

@Injectable()
export class ReportGenFollowerService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(ReportGenFollowerService.name);

  // Current round of the epoch
  private _round: number = 0;
  private _sentEcho: IAttestedReport | null = null;
  private _sentReport: boolean = false;
  private _completedRound: boolean = false;
  private _receivedEcho: Map<string, boolean> = new Map();

  private readonly _roundMax: number = 3; // 3 - 20 recommended by OCR white paper

  // Maximum number of faulty oracles
  private _f: number = 2; // TODO: let this be dynamically set to 1/3 of number of oracles

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _reportgenNetworkService: ReportGenNetworkService,
    private readonly _eventHubService: EventHubService
  ) {}

  public async onModuleInit(): Promise<void> {
    this._reportgenNetworkService.on('observeReq', (from, round) => this.onObserveReqReceived(from, round));
    this._reportgenNetworkService.on('reportReq', (from, { round, report }) =>
      this.onReportReqReceived(from, round, report)
    );
    this._reportgenNetworkService.on('final', (from, { round, attestedReport }) =>
      this.onFinalReceived(from, round, attestedReport)
    );
    this._reportgenNetworkService.on('finalEcho', (from, { round, attestedReport }) =>
      this.onFinalEchoReceived(from, round, attestedReport)
    );
  }

  public async onObserveReqReceived(from: PeerId, round: number): Promise<void> {
    // TODO: check if from is leader
    if (!(this._round < round && round <= this._roundMax + 1)) {
      return;
    }

    this._round = round;

    if (this._round > this._roundMax) {
      this._eventHubService.changeleader();
      return;
    }

    this._sentEcho = null;
    this._sentReport = false;
    this._completedRound = false;
    this._receivedEcho = new Map(); // This should contain n 0s

    const observation = new BigNumber(10); // TODO: add price fetcher result
    const signature = await this._signObservation(observation);

    await this._reportgenNetworkService.sendObserve(from, {
      round,
      observation,
      signature
    });
  }

  public async onReportReqReceived(from: PeerId, round: number, report: IReport): Promise<void> {
    // TODO: Check report is sorted
    // TODO: Check report contains 2f+1 entries (from separate oracles)
    // TODO: Check signatures
    // return if any of these checks fail

    if (this._shouldReport(report)) {
      const compressedReport = this._compressReport(report);
      const signature = await this._signCompressedReport(compressedReport);
      this._sentReport = true;

      await this._reportgenNetworkService.sendReport(from, {
        compressedReport,
        round,
        signature
      });
    } else {
      await this._completeRound();
    }
  }

  public async onFinalReceived(from: PeerId, round: number, attestedReport: IAttestedReport): Promise<void> {
    // TODO: check if leader
    if (round !== this._round || this._sentEcho) {
      return;
    }

    if (!this._verifyAttestedReport(attestedReport)) {
      return;
    }

    this._sentEcho = true;
    await this._reportgenNetworkService.broadcastFinalEcho(round, attestedReport);
  }

  public async onFinalEchoReceived(
    from: PeerId,
    round: number,
    attestedReport: IAttestedReport
  ): Promise<void> {
    if (round !== this._round || this._receivedEcho.get(from.toString()) || this._completedRound) {
      return;
    }

    if (!this._verifyAttestedReport(attestedReport)) {
      return;
    }

    this._receivedEcho.set(from.toString(), true);

    if (this._sentEcho === null) {
      this._sentEcho = attestedReport;
      await this._reportgenNetworkService.broadcastFinalEcho(this._round, attestedReport);
    }

    const numberOfFinalEchoReceived = [...this._receivedEcho.values()].filter((received) => received).length;
    if (numberOfFinalEchoReceived > this._f) {
      await this._eventHubService.transmit();
      await this._completeRound();
    }
  }

  private _compressReport(report: IReport): ICompressedReport {
    // TODO: implement
    return report;
  }

  private async _signObservation(observation: BigNumber): Promise<string> {
    // TODO: do a real signature
    return observation.toString();
  }

  private async _signCompressedReport(report: IReport): Promise<string> {
    // TODO: do a real signature
    return JSON.stringify(report);
  }

  private _shouldReport(report: IReport): boolean {
    return true;
  }

  private async _completeRound(): Promise<void> {
    this._completedRound = true;
    this._eventHubService.progress();
  }

  private _verifyAttestedReport(attestedReport: IAttestedReport): boolean {
    // TODO: implement
    return true;
  }
}
