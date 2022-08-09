import { Logger } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import { PacemakerNetworkService } from './pacemaker.network.service.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { EventHubService, IEventHubEvents } from '../event-hub/index.js';
import { ContractService } from '../contract/index.js';
import { IPacemakerConfig } from './pacemaker.config.js';
import { ReportGenFactoryService } from '../reportgen/index.js';
import { INewEpochMessage, IPacemakerEvents, IPaceMakerState } from './index.js';
import { computeFValueFrom } from './helpers.js';
import { IOracleInformations } from '@tezosdynamics/contracts';
import { Timer } from './timer.js';
/**
 * The pacemaker service as described in https://research.chain.link/ocr.pdf Section 4.
 * With some differences:
 * - The state (epoch) is initialized from the smart contract. So if all oracles restart at the same time,
 *   it does not have to count from 0 to the smart contract epoch.
 *
 * Pacemakers are instantiated by the Pacemaker factory with a 1:1 relation with aggregator smart contract.
 * So a pacemaker will handle a single aggregator smart contract.
 * It also means multiple pacemaker will run at the same time.
 *
 * The role of the pacemaker is to ensure a consensus with other oracle of the current epoch
 * and provide this information to the next stage: the Report Generation Algorithm (leader and follower)
 *
 * How it works:
 * We broadcast our value of the current epoch and listen to the value broadcasted by other oracles for the aggregator
 * If more than f oracles are broadcasting a greater epoch value than us, we catch up to the maximum value broadcasted by at least f oracles (Amplification rule)
 * If more than 2 * f oracles are broadcasting an epoch value, we consider it as THE value and start the report generation algorithm with this value
 * Also, we keep track if the current epoch is running correctly using the progress events. If we do not hear the progress event for some time, we increment the current epoch and start broadcasting this new value
 */
export class PacemakerService {
  private readonly _logger: Logger = new Logger(PacemakerService.name);

  // PeerId of currently running oracle
  private _self: string;

  // Current epoch and leader. Group then in the same structure to make sure these are updated at the same time
  private _epochAndLeader: {
    epoch: number;
    leader: string;
  };

  // Highest newEpoch sent to other peers
  private _newEpoch: number;

  /* Highest newEpoch received for each peer (including ourselves)
     Example:
       peerID1 -> 12
       peerID3 -> 13
       peerID4 -> 12
   */
  private _peersNewEpoch: Map<string, number> = new Map();

  // Timers
  private readonly _timerProgress: Timer;
  private readonly _timerResend: Timer;

  // Listeners stored so we can clear them
  private progressListener: IEventHubEvents['progress'];
  private changeLeaderListener: IEventHubEvents['changeLeader'];
  private newEpochListener: IPacemakerEvents['newEpoch'];

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _pacemakerNetworkService: PacemakerNetworkService,
    private readonly _eventHubService: EventHubService,
    private readonly _contractService: ContractService,
    private readonly _reportGenFactoryService: ReportGenFactoryService,
    private readonly _pacemakerConfig: IPacemakerConfig
  ) {
    this._timerProgress = new Timer(
      this._onProgressTimerTimeout.bind(this),
      this._pacemakerConfig.timerProgressDurationMiliseconds
    );
    this._timerResend = new Timer(
      this._onResendTimerTimeout.bind(this),
      this._pacemakerConfig.timerResendDurationMiliseconds
    );
  }

  /**
   * Initialize the pacemaker service state and start listening to the necessary events
   */
  public async initialize(): Promise<void> {
    this._self = this._config.peerId;

    this.progressListener = this._onProgress.bind(this);
    this.changeLeaderListener = this._onChangeLeader.bind(this);
    this.newEpochListener = this._onNewEpochReceived.bind(this);

    // Bind needed events to callbacks
    this._eventHubService.addListener('progress', this.progressListener);
    this._eventHubService.addListener('changeLeader', this.changeLeaderListener);
    this._pacemakerNetworkService.addListener('newEpoch', this.newEpochListener);

    // Read epoch from aggregator smart contract
    const { epoch } = await this._contractService.getLastBlockchainReport(
      this._pacemakerConfig.aggregatorAddress
    );

    this._logger.log(
      `${this._pacemakerConfig.aggregatorAddress}/${epoch} - Starting pacemaker with epoch from blockchain: ${epoch}`
    );

    this._epochAndLeader = {
      epoch,
      leader: this._leaderForEpoch(this._pacemakerConfig.oracleAddresses, epoch)
    };
    this._newEpoch = epoch;

    const blockchainConfig = await this._contractService.getAggregatorConfig(
      this._pacemakerConfig.aggregatorAddress
    );

    this._reportGenFactoryService.startReportGen({
      epoch: this._epochAndLeader.epoch,
      leader: this._epochAndLeader.leader,
      aggregatorAddress: this._pacemakerConfig.aggregatorAddress,
      aggregatorPair: this._pacemakerConfig.aggregatorPair,
      alpha: blockchainConfig.alphaPercentPerThousand,
      heartbeatSeconds: blockchainConfig.heartBeatSeconds,
      oracleAddresses: this._pacemakerConfig.oracleAddresses
    });

    this._timerProgress.restart();
  }

  public async stop() {
    this._timerProgress.stop();
    this._timerResend.stop();
    this._eventHubService.removeListener('progress', this.progressListener);
    this._eventHubService.removeListener('changeLeader', this.changeLeaderListener);
    this._pacemakerNetworkService.removeListener('newEpoch', this.newEpochListener);
  }

  /**
   * Returns a summary of the pacemaker state.
   * Can be used for observability and unit tests
   */
  public getState(): IPaceMakerState {
    return {
      epoch: this._epochAndLeader.epoch,
      leader: this._epochAndLeader.leader,
      newEpoch: this._newEpoch,
      peersNewEpoch: this._peersNewEpoch
    };
  }

  private async _onProgress(aggregatorAddress: string): Promise<void> {
    if (aggregatorAddress !== this._pacemakerConfig.aggregatorAddress) {
      return;
    }
    this._timerProgress.restart();
  }

  private async _sendNewEpoch(newEpoch: number): Promise<void> {
    await this._pacemakerNetworkService.broadcastNewEpoch({
      newEpoch,
      aggregatorAddress: this._pacemakerConfig.aggregatorAddress
    });
    this._newEpoch = newEpoch;

    this._timerResend.restart();
  }

  private async _onResendTimerTimeout(): Promise<void> {
    await this._sendNewEpoch(this._newEpoch);
  }

  private async _onProgressTimerTimeout(): Promise<void> {
    this._logger.log(
      `${this._pacemakerConfig.aggregatorAddress}/${this._epochAndLeader.epoch} - Progress timer timeout with leader: ${this._epochAndLeader.leader}`
    );
    this._timerProgress.restart();
    await this._sendNewEpoch(Math.max(this._epochAndLeader.epoch + 1, this._newEpoch));
  }

  private async _onChangeLeader(aggregatorAddress: string): Promise<void> {
    if (aggregatorAddress !== this._pacemakerConfig.aggregatorAddress) {
      return;
    }

    this._timerProgress.restart();
    await this._sendNewEpoch(Math.max(this._epochAndLeader.epoch + 1, this._newEpoch));
  }

  private async _onNewEpochReceived(from: PeerId, newEpochMessage: INewEpochMessage): Promise<void> {
    if (newEpochMessage.aggregatorAddress !== this._pacemakerConfig.aggregatorAddress) {
      // Silently ignore new epoch message for other aggregators
      return;
    }

    this._peersNewEpoch.set(
      from.toString(),
      Math.max(this._peersNewEpoch.get(from.toString()) ?? 0, newEpochMessage.newEpoch)
    );

    try {
      await this._checkAmplificationRule();
    } catch (e) {
      this._logger.error(`Error during amplification rule check: ${e.toString()}`);
    }
    try {
      await this._checkAgreementRule();
    } catch (e) {
      this._logger.error(`Error during agreement rule check: ${e.toString()}`);
    }
  }

  /**
   * Check if amplification rule is passing:
   * When at least f oracles are broadcasting epoch value greater than newEpoch, it should increment the newEpoch
   *
   * @private
   */
  private async _checkAmplificationRule(): Promise<void> {
    // Construct array with values received from peers
    // Example: [3, 2, 5, 3, 5]
    const peersEpochs = Array.from(this._peersNewEpoch.values());

    // Deduplicate and sort (greater to lower) values
    // Example: [5, 3, 2]
    const peersNewEpochUnique = [...new Set(peersEpochs)]
      .filter((epoch) => epoch > this._newEpoch)
      .sort()
      .reverse();

    const f = computeFValueFrom(this._pacemakerConfig.oracleAddresses.length);

    // Tmp value to check against if amplification check fails
    let epoch = -1;

    for (const newEpoch of peersNewEpochUnique) {
      // Count the number of peers that sent at least this value
      const peersNewEpochGreaterThan = peersEpochs.filter((value) => value >= newEpoch).length;

      if (peersNewEpochGreaterThan > f) {
        // If more than f have sent a greater value, keep the candidate value.
        epoch = newEpoch;

        // We are sure that it's the biggest value since we iterate on a descending sorted array
        break;
      }
    }

    // If no values have matched the find, epoch is still equal to -1
    if (epoch === -1) {
      // If amplification check fails, simply returns.
      return;
    }

    this._logger.log(
      `${this._pacemakerConfig.aggregatorAddress}/${this._epochAndLeader.epoch} - Amplification rule passed for epoch ${epoch}`
    );

    await this._sendNewEpoch(Math.max(epoch, this._newEpoch));
  }

  /**
   * Check if agreement rule is passing:
   * When at least 2 * f oracles are broadcasting epoch value greater than current epoch
   *
   * @private
   */
  private async _checkAgreementRule(): Promise<void> {
    // Construct array with values received from peers
    // Example: [3, 2, 5, 3, 5]
    const peersEpochs = Array.from(this._peersNewEpoch.values());

    // Deduplicate, sort values (greater to lower) and filter only values greater than current epoch
    // Example: [5, 3] if current epoch is 2
    const peersNewEpochUnique = [...new Set(peersEpochs)]
      .filter((epoch) => epoch > this._epochAndLeader.epoch)
      .sort()
      .reverse();

    const f = computeFValueFrom(this._pacemakerConfig.oracleAddresses.length);

    // Tmp value to check against if agreement check fails
    let epoch = -1;
    for (const newEpoch of peersNewEpochUnique) {
      // Count the number of peers that sent at this value or greater
      const peersNewEpochGreaterThan = peersEpochs.filter((value) => value >= newEpoch).length;

      if (peersNewEpochGreaterThan > 2 * f) {
        // If more than 2*f have sent a greater value, keep the candidate value.
        epoch = newEpoch;

        // We are sure that it's the biggest value since we iterate on a descending sorted array
        break;
      }
    }

    // If no values have matched the find, epoch is still equal to -1
    if (epoch === -1) {
      // If agreement check fails, simply returns.
      return;
    }

    this._logger.log(
      `${this._pacemakerConfig.aggregatorAddress}/${this._epochAndLeader.epoch} - Agreement rule passed for epoch ${epoch}`
    );

    // Set the current epoch and compute the new leader
    this._epochAndLeader = {
      epoch,
      leader: this._leaderForEpoch(this._pacemakerConfig.oracleAddresses, epoch)
    };

    // Stop the previous report generation instance
    this._reportGenFactoryService.stopReportGen(this._pacemakerConfig.aggregatorAddress);

    // Update newEpoch
    this._newEpoch = Math.max(this._newEpoch, epoch);

    const blockchainConfig = await this._contractService.getAggregatorConfig(
      this._pacemakerConfig.aggregatorAddress
    );

    // Start new report generation instance
    this._reportGenFactoryService.startReportGen({
      epoch: this._epochAndLeader.epoch,
      leader: this._epochAndLeader.leader,
      aggregatorAddress: this._pacemakerConfig.aggregatorAddress,
      aggregatorPair: this._pacemakerConfig.aggregatorPair,
      alpha: blockchainConfig.alphaPercentPerThousand,
      heartbeatSeconds: blockchainConfig.heartBeatSeconds,
      oracleAddresses: this._pacemakerConfig.oracleAddresses
    });

    this._timerProgress.restart();

    // If we are the leader, send a startepoch event for the leader generation algorithm
    if (this._epochAndLeader.leader === this._self) {
      this._eventHubService.startepoch(
        this._pacemakerConfig.aggregatorAddress,
        this._epochAndLeader.epoch,
        this._epochAndLeader.leader
      );
    }
  }

  private _leaderForEpoch(oracleAddresses: IOracleInformations[], epoch: number): string {
    const oraclePeersIdList: string[] = [...oracleAddresses.values()].map((infos) => infos.oraclePeerId);
    const oracleLeaderIndex = epoch % oraclePeersIdList.length;

    return oraclePeersIdList[oracleLeaderIndex];
  }
}
