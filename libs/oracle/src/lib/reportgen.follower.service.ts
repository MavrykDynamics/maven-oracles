import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from './oracle.config.js';
import BigNumber from 'bignumber.js';
import {
  IAttestedReport,
  ICompressedReport,
  IReport,
  ISignature,
  ReportGenNetworkService
} from './reportgen.network.service.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { EventHubService } from './eventhub.service.js';
import { signData } from './helpers.js';
import { ContractService } from './contract.service.js';

@Injectable()
export class ReportGenFollowerService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(ReportGenFollowerService.name);

  private _epoch: number;
  private _leader: string;

  // Current round of the epoch
  private _round: number = 0;
  private _sentEcho: IAttestedReport | null = null;
  private _sentReport: boolean = false;
  private _completedRound: boolean = false;
  private _receivedEcho: Map<string, boolean> = new Map();

  private readonly _roundMax: number = 3; // 3 - 20 recommended by OCR white paper

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _reportgenNetworkService: ReportGenNetworkService,
    private readonly _eventHubService: EventHubService,
    private readonly _contractService: ContractService
  ) {
    this._eventHubService.on('stopReportGen', () => this._onStopReportGen());
    this._eventHubService.on('startReportGen', (epoch, leader) => this._onStartReportGen(epoch, leader));
  }

  private _onStopReportGen(): void {
    // TODO: ???
  }
  private _onStartReportGen(epoch: number, leader: string): void {
    this._epoch = epoch;
    this._leader = leader;
    this._round = 0;
    this._sentEcho = null;
    this._sentReport = false;
    this._completedRound = false;
    this._receivedEcho = new Map<string, boolean>();
  }

  public async onModuleInit(): Promise<void> {
    this._reportgenNetworkService.on('observeReq', (from, round) => this.onObserveReqReceived(from, round));
    this._reportgenNetworkService.on('reportReq', (from, { report }) =>
      this.onReportReqReceived(from, report)
    );
    this._reportgenNetworkService.on('final', (from, { attestedReport }) =>
      this.onFinalReceived(from, attestedReport)
    );
    this._reportgenNetworkService.on('finalEcho', (from, { attestedReport }) =>
      this.onFinalEchoReceived(from, attestedReport)
    );
  }

  public async onObserveReqReceived(from: PeerId, round: number): Promise<void> {
    if (from.toString() !== this._leader) {
      this._logger.warn(
        'onObserveReqReceived: Observation request received from someone else than leader, discarding request'
      );
      return;
    }
    if (!(this._round < round && round <= this._roundMax + 1)) {
      this._logger.warn('onObserveReqReceived: Observation request invalid round number, discarding request');
      return;
    }

    this._round = round;

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
    this._receivedEcho = new Map(); // This should contain n 0s

    const observation = new BigNumber(Math.floor(Math.random() * 100)); // TODO: add price fetcher result
    const signature = await this._signObservation(observation);

    await this._reportgenNetworkService.sendObserve(from, {
      epoch: this._epoch,
      round,
      observation,
      signature
    });
  }

  public async onReportReqReceived(from: PeerId, report: IReport): Promise<void> {
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

    // TODO: Check signatures

    if (this._shouldReport(report)) {
      const compressedReport = this._compressReport(report);
      const signature = await this._signCompressedReport(compressedReport);
      this._sentReport = true;

      await this._reportgenNetworkService.sendReport(from, {
        epoch: report.epoch,
        round: report.round,
        compressedReport,
        signature
      });
    } else {
      await this._completeRound();
    }
  }

  public async onFinalReceived(from: PeerId, attestedReport: IAttestedReport): Promise<void> {
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
    await this._reportgenNetworkService.broadcastFinalEcho(attestedReport);
  }

  public async onFinalEchoReceived(from: PeerId, attestedReport: IAttestedReport): Promise<void> {
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
      await this._reportgenNetworkService.broadcastFinalEcho(attestedReport);
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
    return await signData(this._config.peerPrivateKey, encodedObservation);
  }

  private async _signCompressedReport(report: ICompressedReport): Promise<ISignature> {
    const signature = await this._contractService.signCompressedReport(
      report.observations,
      this._config.tezosSecretKey
    );
    return {
      oracle: this._config.tezosAddress,
      signature
    };
  }

  private _shouldReport(report: IReport): boolean {
    // TODO: implement
    return true;
  }

  private async _completeRound(): Promise<void> {
    this._completedRound = true;
    this._eventHubService.progress();
  }

  private async _verifyAttestedReport(attestedReport: IAttestedReport): Promise<boolean> {
    return await this._contractService.verifyAttestedReport(attestedReport);
  }
}
