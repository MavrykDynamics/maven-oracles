import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from './oracle.config.js';
import { PacemakerNetworkService } from './pacemaker.network.service.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { EventHubService } from './eventhub.service.js';

@Injectable()
export class PacemakerService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(PacemakerService.name);

  private readonly _timerProgressDurationMiliseconds: number = 30 * 1000; // 30s recommended by OCR white paper
  private readonly _timerResendDurationMiliseconds: number = 15 * 1000; // 15s recommended by OCR white paper

  // PeerId of currently running oralce
  private _self: string;

  // Current epoch and leader
  private _epochAndLeader: {
    epoch: number;
    leader: string;
  };

  // Highest newEpoch sent to other peers
  private _newEpoch: number;

  // Highest newEpoch received for each peer (including ourself)
  private _peersNewEpoch: Map<string, number> = new Map();

  private _timerProgress: NodeJS.Timeout | null = null;
  private _timerResend: NodeJS.Timeout | null = null;

  // Maximum number of faulty oracles
  private _f: number = 2; // TODO: let this be dynamically set to 1/3 of number of oracles

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _pacemakerNetworkService: PacemakerNetworkService,
    private readonly _eventHubService: EventHubService
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  public async initialize(): Promise<void> {
    this._self = this._config.peerId;
    this._epochAndLeader = {
      epoch: 0,
      leader: await this.leaderForEpoch(0)
    };
    this._newEpoch = 0;

    // TODO: initialize report generation
    this._logger.log(
      `TODO: initialize report generation (${this._epochAndLeader.epoch}, ${this._epochAndLeader.leader})`
    );

    this._eventHubService.on('progress', () => this.onProgress());
    this._eventHubService.on('changeleader', () => this.onChangeLeader());
    this._pacemakerNetworkService.on('newEpoch', (peerId, newEpoch) =>
      this.onNewEpochReceived(peerId, newEpoch)
    );
    this._restartProgressTimer();
  }

  public async onProgress(): Promise<void> {
    this._restartProgressTimer();
  }

  public async sendNewEpoch(newEpoch: number): Promise<void> {
    await this._pacemakerNetworkService.broadcastNewEpoch(newEpoch);
    this._newEpoch = newEpoch;

    this._restartResendTimer();
  }

  public async onResendTimerTimeout(): Promise<void> {
    await this.sendNewEpoch(this._newEpoch);

    this._restartResendTimer();
  }

  public async onProgressTimerTimeout(): Promise<void> {
    this._logger.log(`Progress timer timeout with leader: ${this._epochAndLeader.leader}`);
    this._stopProgressTimer();
    await this.sendNewEpoch(Math.max(this._epochAndLeader.epoch + 1, this._newEpoch));
  }

  public async onChangeLeader(): Promise<void> {
    this._stopProgressTimer();
    await this.sendNewEpoch(Math.max(this._epochAndLeader.epoch + 1, this._newEpoch));
  }

  public async onNewEpochReceived(from: PeerId, newEpoch: number): Promise<void> {
    this._peersNewEpoch.set(
      from.toString(),
      Math.max(this._peersNewEpoch.get(from.toString()) ?? 0, newEpoch)
    );

    await this.checkAmplificationRule();
    await this.checkAgreementRule();
  }

  public async checkAmplificationRule(): Promise<void> {
    const peersEpochs = Array.from(this._peersNewEpoch.values());
    const peersNewEpochUnique = [...new Set(peersEpochs)].filter((epoch) => epoch > this._newEpoch).sort(); // Example: [2, 3, 3, 5, 5]

    let epoch = -1;
    for (const newEpoch of peersNewEpochUnique) {
      const peersNewEpochGreaterThan = peersEpochs.filter((value) => value > newEpoch).length;

      if (peersNewEpochGreaterThan > this._f) {
        epoch = newEpoch;
      }
    }

    if (epoch === -1) {
      return;
    }

    this._logger.verbose('Amplification rule passed');

    await this.sendNewEpoch(Math.max(epoch, this._newEpoch));
  }

  public async checkAgreementRule(): Promise<void> {
    const peersEpochs = Array.from(this._peersNewEpoch.values());
    const peersNewEpochUnique = [...new Set(peersEpochs)]
      .filter((epoch) => epoch > this._epochAndLeader.epoch)
      .sort(); // Example: [2, 3, 3, 5, 5]

    let epoch = -1;
    for (const newEpoch of peersNewEpochUnique) {
      const peersNewEpochGreaterThan = peersEpochs.filter(
        (value) => value >= this._epochAndLeader.epoch
      ).length;

      if (peersNewEpochGreaterThan > 2 * this._f) {
        epoch = newEpoch;
      }
    }

    if (epoch === -1) {
      return;
    }

    this._eventHubService.stopReportGen();

    this._epochAndLeader = {
      epoch,
      leader: await this.leaderForEpoch(epoch)
    };
    this._newEpoch = Math.max(this._newEpoch, epoch);

    this._eventHubService.startReportGen(this._epochAndLeader.epoch, this._epochAndLeader.leader);

    this._restartProgressTimer();

    if (this._epochAndLeader.leader === this._self) {
      this._eventHubService.startepoch(this._epochAndLeader.epoch, this._epochAndLeader.leader);
    }
  }

  public async leaderForEpoch(epoch: number): Promise<string> {
    // TODO: fetch this list from smart contract
    const oracles = [
      '12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1',
      '12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2',
      '12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3',
      '12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34',
      '12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5',
      '12D3KooWEKXXjviRoWwoB37UzBT4qjUBbQH8bypWy3YWmyfvR736',
      '12D3KooWRGcN9uh633ucfUJ3XQ69n31mB2jPHKtrw7mfCSJdLz97'
    ];

    const oracleLeaderIndex = epoch % (oracles.length - 1);

    return oracles[oracleLeaderIndex];
  }

  private _stopProgressTimer(): void {
    if (this._timerProgress !== null) {
      clearTimeout(this._timerProgress);
    }
  }

  private _restartProgressTimer(): void {
    this._stopProgressTimer();
    this._timerProgress = setTimeout(
      () => this.onProgressTimerTimeout(),
      this._timerProgressDurationMiliseconds
    );
  }

  private _stopResendTimer(): void {
    if (this._timerResend !== null) {
      clearTimeout(this._timerResend);
    }
  }
  private _restartResendTimer(): void {
    this._stopResendTimer();
    this._timerResend = setTimeout(() => this.onResendTimerTimeout(), this._timerResendDurationMiliseconds);
  }
}
