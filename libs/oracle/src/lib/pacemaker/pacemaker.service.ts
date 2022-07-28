import { Injectable, Logger } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import { INewEpochMessage, IPacemakerEvents, PacemakerNetworkService } from './pacemaker.network.service.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { EventHubService, IEvents } from '../eventhub.service.js';
import { ContractService } from '../contract.service.js';
import { IPacemakerConfig } from './pacemaker.config.js';
import { ReportGenFactoryService } from '../reportgen/reportgen.factory.service.js';
import BigNumber from 'bignumber.js';

@Injectable()
export class PacemakerService {
  private readonly _logger: Logger = new Logger(PacemakerService.name);

  private readonly _timerProgressDurationMiliseconds: number = 30 * 1000; // 30s recommended by OCR white paper
  private readonly _timerResendDurationMiliseconds: number = 15 * 1000; // 15s recommended by OCR white paper

  // PeerId of currently running oracle
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

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _pacemakerNetworkService: PacemakerNetworkService,
    private readonly _eventHubService: EventHubService,
    private readonly _contractService: ContractService,
    private readonly _reportGenFactoryService: ReportGenFactoryService,
    private readonly _pacemakerConfig: IPacemakerConfig
  ) {
    this._self = this._config.peerId;

    this._eventHubService.addListener('progress', this._onProgressHandler);
    this._eventHubService.addListener('changeleader', this._onChangeLeaderHandler);
    this._pacemakerNetworkService.addListener('newEpoch', this._onNewEpochReceivedHandler);
  }

  private readonly _onProgressHandler: IEvents['progress'] = (aggregatorAddress) =>
    this.onProgress(aggregatorAddress);
  private readonly _onChangeLeaderHandler: IEvents['changeleader'] = (aggregatorAddress) =>
    this.onChangeLeader(aggregatorAddress);
  private readonly _onNewEpochReceivedHandler: IPacemakerEvents['newEpoch'] = (
    from: PeerId,
    newEpochMessage: INewEpochMessage
  ) => this.onNewEpochReceived(from, newEpochMessage);

  public async initialize(): Promise<void> {
    const { epoch } = await this._contractService._getLastBlockchainReport(
      this._pacemakerConfig.aggregatorAddress
    );

    this._logger.log(
      `${this._pacemakerConfig.aggregatorAddress}/${epoch} - Starting pacemaker with epoch from blockchain: ${epoch}`
    );

    this._epochAndLeader = {
      epoch,
      leader: await this.leaderForEpoch(epoch)
    };
    this._newEpoch = epoch;

    const blockchainConfig = await this._contractService._getBlockchainConfig(
      this._pacemakerConfig.aggregatorAddress
    );

    this._reportGenFactoryService.startReportGen({
      epoch: this._epochAndLeader.epoch,
      leader: this._epochAndLeader.leader,
      aggregatorAddress: this._pacemakerConfig.aggregatorAddress,
      alpha: new BigNumber(blockchainConfig.alphaPercentPerThousand),
      heartbeatSeconds: new BigNumber(blockchainConfig.heartBeatSeconds)
    });

    this._restartProgressTimer();
  }

  public async onProgress(aggregatorAddress: string): Promise<void> {
    if (aggregatorAddress !== this._pacemakerConfig.aggregatorAddress) {
      return;
    }
    this._restartProgressTimer();
  }

  public async sendNewEpoch(newEpoch: number): Promise<void> {
    await this._pacemakerNetworkService.broadcastNewEpoch({
      newEpoch,
      aggregatorAddress: this._pacemakerConfig.aggregatorAddress
    });
    this._newEpoch = newEpoch;

    this._restartResendTimer();
  }

  public async onResendTimerTimeout(): Promise<void> {
    await this.sendNewEpoch(this._newEpoch);

    this._restartResendTimer();
  }

  public async onProgressTimerTimeout(): Promise<void> {
    this._logger.log(
      `${this._pacemakerConfig.aggregatorAddress}/${this._epochAndLeader.epoch} - Progress timer timeout with leader: ${this._epochAndLeader.leader}`
    );
    this._stopProgressTimer();
    await this.sendNewEpoch(Math.max(this._epochAndLeader.epoch + 1, this._newEpoch));
  }

  public async onChangeLeader(aggregatorAddress: string): Promise<void> {
    if (aggregatorAddress !== this._pacemakerConfig.aggregatorAddress) {
      return;
    }

    this._stopProgressTimer();
    await this.sendNewEpoch(Math.max(this._epochAndLeader.epoch + 1, this._newEpoch));
  }

  public async onNewEpochReceived(from: PeerId, newEpochMessage: INewEpochMessage): Promise<void> {
    if (newEpochMessage.aggregatorAddress !== this._pacemakerConfig.aggregatorAddress) {
      // Silently ignore new epoch message for other aggregators
      return;
    }

    this._peersNewEpoch.set(
      from.toString(),
      Math.max(this._peersNewEpoch.get(from.toString()) ?? 0, newEpochMessage.newEpoch)
    );

    await this.checkAmplificationRule();
    await this.checkAgreementRule();
  }

  public async checkAmplificationRule(): Promise<void> {
    const peersEpochs = Array.from(this._peersNewEpoch.values());
    const peersNewEpochUnique = [...new Set(peersEpochs)].filter((epoch) => epoch > this._newEpoch).sort(); // Example: [2, 3, 3, 5, 5]

    const f = await this._contractService.getFValue(this._pacemakerConfig.aggregatorAddress);
    let epoch = -1;
    for (const newEpoch of peersNewEpochUnique) {
      const peersNewEpochGreaterThan = peersEpochs.filter((value) => value > newEpoch).length;

      if (peersNewEpochGreaterThan > f) {
        epoch = newEpoch;
      }
    }

    if (epoch === -1) {
      return;
    }

    this._logger.log(
      `${this._pacemakerConfig.aggregatorAddress}/${this._epochAndLeader.epoch} - Amplification rule passed for epoch ${epoch}`
    );

    await this.sendNewEpoch(Math.max(epoch, this._newEpoch));
  }

  public async checkAgreementRule(): Promise<void> {
    const peersEpochs = Array.from(this._peersNewEpoch.values());
    const peersNewEpochUnique = [...new Set(peersEpochs)]
      .filter((epoch) => epoch > this._epochAndLeader.epoch)
      .sort(); // Example: [2, 3, 3, 5, 5]

    const f = await this._contractService.getFValue(this._pacemakerConfig.aggregatorAddress);
    let epoch = -1;
    for (const newEpoch of peersNewEpochUnique) {
      const peersNewEpochGreaterThan = peersEpochs.filter(
        (value) => value >= this._epochAndLeader.epoch
      ).length;

      if (peersNewEpochGreaterThan > 2 * f) {
        epoch = newEpoch;
      }
    }

    if (epoch === -1) {
      return;
    }

    this._logger.log(
      `${this._pacemakerConfig.aggregatorAddress}/${this._epochAndLeader.epoch} - Agreement rule passed for epoch ${epoch}`
    );

    this._epochAndLeader = {
      epoch,
      leader: await this.leaderForEpoch(epoch)
    };

    this._reportGenFactoryService.stopReportGen(this._pacemakerConfig.aggregatorAddress);

    this._newEpoch = Math.max(this._newEpoch, epoch);

    this._reportGenFactoryService.startReportGen({
      epoch: this._epochAndLeader.epoch,
      leader: this._epochAndLeader.leader,
      aggregatorAddress: this._pacemakerConfig.aggregatorAddress,
      alpha: new BigNumber(500),
      heartbeatSeconds: new BigNumber(60)
    });

    this._restartProgressTimer();

    await this._contractService.updateOraclesAddressesMap(this._pacemakerConfig.aggregatorAddress);

    if (this._epochAndLeader.leader === this._self) {
      this._eventHubService.startepoch(
        this._pacemakerConfig.aggregatorAddress,
        this._epochAndLeader.epoch,
        this._epochAndLeader.leader
      );
    }
  }

  public async leaderForEpoch(epoch: number): Promise<string> {
    const peersIdList: string[] = [];
    const oracleAddresses = await this._contractService.getOraclesAddresses(
      this._pacemakerConfig.aggregatorAddress
    );
    for (const [, value] of oracleAddresses.entries()) {
      peersIdList.push(value.oraclePeerId);
    }

    const oracleLeaderIndex = epoch % (peersIdList.length - 1);

    return peersIdList[oracleLeaderIndex];
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
