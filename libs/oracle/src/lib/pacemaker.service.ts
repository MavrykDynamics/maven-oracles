import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from './oracle.config.js';
import { INewEpochEvents, PacemakerNetworkService } from './pacemaker.network.service.js';

@Injectable()
export class PacemakerService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(PacemakerService.name);

  private readonly _timerProgressDurationMiliseconds: number = 30 * 1000;
  private readonly _timerResendDurationMiliseconds: number = 15 * 1000;

  private _self: string;
  private _epochAndLeader: {
    epoch: number;
    leader: string;
  };
  private _newEpoch: number;
  private _peersNewEpoch: Map<string, number> = new Map();
  private _timerProgress: NodeJS.Timeout | null = null; // Type timer, yet to be determined
  private _timerResend: NodeJS.Timeout | null = null; // Type timer, yet to be determined
  private _f: number = 2; // TODO: let this be 1/3 of number of oracles

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _pacemakerNetworkService: PacemakerNetworkService
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  public async initialize(): Promise<void> {
    this._self = this._config.peerId; // TODO: set self variable
    this._epochAndLeader = {
      epoch: 0,
      leader: await this.leaderForEpoch(0)
    };
    this._newEpoch = 0;

    // TODO: initialize report generation
    this._logger.log(
      `TODO: initialize report generation (${this._epochAndLeader.epoch}, ${this._epochAndLeader.leader})`
    );

    this._pacemakerNetworkService.on('newEpoch', (peerId, newEpoch) =>
      this.onNewEpochReceived(peerId, newEpoch)
    );
    this.restartProgressTimer();
  }

  public async onProgress(): Promise<void> {
    this.restartProgressTimer();
  }

  public async sendNewEpoch(newEpoch: number): Promise<void> {
    await this._pacemakerNetworkService.broadcastNewEpoch(newEpoch);
    this._newEpoch = newEpoch;

    this.restartResendTimer();
  }

  public async onResendTimerTimeout(): Promise<void> {
    await this.sendNewEpoch(this._newEpoch);

    this.restartResendTimer();
  }

  public async onProgressTimerTimeout(): Promise<void> {
    this.stopProgressTimer();
    await this.sendNewEpoch(Math.max(this._epochAndLeader.epoch + 1, this._newEpoch));
  }

  public async onChangeLeader(): Promise<void> {
    this.stopProgressTimer();
    await this.sendNewEpoch(Math.max(this._epochAndLeader.epoch + 1, this._newEpoch));
  }

  public async onNewEpochReceived(from: string, newEpoch: number): Promise<void> {
    this._peersNewEpoch.set(from, Math.max(this._peersNewEpoch[from] ?? 0, newEpoch));

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

    // TODO: abort report generation (epoch, leader)
    this._logger.log(
      `TODO: abort report generation (${this._epochAndLeader.epoch}, ${this._epochAndLeader.leader})`
    );

    this._epochAndLeader = {
      epoch,
      leader: await this.leaderForEpoch(epoch)
    };
    this._newEpoch = Math.max(this._newEpoch, epoch);

    // TODO: initialize report generation
    this._logger.log(
      `TODO: initialize report generation (${this._epochAndLeader.epoch}, ${this._epochAndLeader.leader})`
    );
    this.restartProgressTimer();

    if (this._epochAndLeader.leader === this._self) {
      // TODO: invoke event start epoch
      this._logger.log('TODO: invoke event start epoch');
    }
  }

  public async leaderForEpoch(epoch: number): Promise<string> {
    // TODO: fetch this list from smart contract
    const oracles = [
      'D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1',
      'D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2',
      'D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3',
      '12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34',
      'D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3',
      'D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3',
      'D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3'
    ];

    const oracleLeaderIndex = epoch % (oracles.length - 1);

    return oracles[oracleLeaderIndex];
  }

  private stopProgressTimer(): void {
    if (this._timerProgress !== null) {
      clearTimeout(this._timerProgress);
    }
  }

  private restartProgressTimer(): void {
    this.stopProgressTimer();
    this._timerProgress = setTimeout(
      () => this.onProgressTimerTimeout(),
      this._timerProgressDurationMiliseconds
    );
  }

  private stopResendTimer(): void {
    if (this._timerResend !== null) {
      clearTimeout(this._timerResend);
    }
  }
  private restartResendTimer(): void {
    this.stopResendTimer();
    this._timerResend = setTimeout(() => this.onResendTimerTimeout(), this._timerResendDurationMiliseconds);
  }
}
