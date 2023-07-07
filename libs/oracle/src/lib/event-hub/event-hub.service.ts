import { Injectable } from '@nestjs/common';
import { TypedEmitter } from 'tiny-typed-emitter';
import { IAttestedReport } from '../reportgen';
import { IEventHubEvents } from './event-hub.types.js';
import { IOracleInformations } from '@mavrykdynamics/contracts';
import BigNumber from 'bignumber.js';
import { getLogger } from '../logger.js';
import { Logger } from 'winston';

/**
 * Event Hub service
 * Enable communication between the different OCR algorithms. The 4 different signals are:
 *
 * - startepoch: Sent by pacemaker service to reportgen leader service if we are leader of the current round.
 * - changeLeader: Sent by reportGen service to pacemaker service if the leader must be changed
 * - progress: Sent by reportGen service to pacemaker service to report that everything is alright
 * - transmit: Sent by reportGen service to transmit service to plan report transmission to the blockchain
 */
@Injectable()
export class EventHubService extends TypedEmitter<IEventHubEvents> {
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: EventHubService.name
    }
  });

  public constructor() {
    super();
  }

  /**
   * Dispatch start epoch event
   */
  public startepoch(aggregatorAddress: string, epoch: number, leader: string): void {
    this._logger.debug(`Dispatching startepoch event for ${aggregatorAddress}/${epoch}/${leader}`);
    this.emit('startepoch', aggregatorAddress, epoch, leader);
  }

  /**
   * Dispatch changeleader event
   */
  public changeLeader(aggregatorAddress: string): void {
    this._logger.debug(`Dispatching changeleader event for ${aggregatorAddress}`);
    this.emit('changeLeader', aggregatorAddress);
  }

  /**
   * Dispatch progress event
   */
  public progress(aggregatorAddress: string): void {
    this._logger.debug(`Dispatching progress event for ${aggregatorAddress}`);
    this.emit('progress', aggregatorAddress);
  }

  /**
   * Dispatch transmit event
   */
  public transmit(
    aggregatorAddress: string,
    oracleLedger: IOracleInformations[],
    reportToTransmit: IAttestedReport,
    alphaPerThousand: BigNumber
  ): void {
    this._logger.debug(
      `Dispatching transmit event for ${aggregatorAddress} with report ${reportToTransmit.epoch}/${reportToTransmit.round}`
    );
    this.emit('transmit', aggregatorAddress, oracleLedger, reportToTransmit, alphaPerThousand);
  }
}
