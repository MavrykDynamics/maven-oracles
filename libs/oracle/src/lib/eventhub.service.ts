import { Injectable, Logger } from '@nestjs/common';
import { TypedEmitter } from 'tiny-typed-emitter';
import { IAttestedReport } from './reportgen/reportgen.network.service.js';

export interface IEvents {
  startepoch: (aggregatorAddress: string, epoch: number, leader: string) => void;
  progress: (aggregatorAddress: string) => void;
  transmit: (aggregatorAddress: string, reportToTransmit: IAttestedReport) => void;
  changeleader: (aggregatorAddress: string) => void;
}

@Injectable()
export class EventHubService extends TypedEmitter<IEvents> {
  private readonly _logger: Logger = new Logger(EventHubService.name);

  public constructor() {
    super();
  }

  public startepoch(aggregatorAddress: string, epoch: number, leader: string): void {
    this._logger.debug(`Dispatching startepoch event for ${aggregatorAddress}/${epoch}/${leader}`);
    this.emit('startepoch', aggregatorAddress, epoch, leader);
  }

  public changeleader(aggregatorAddress: string): void {
    this._logger.debug(`Dispatching changeleader event for ${aggregatorAddress}`);
    this.emit('changeleader', aggregatorAddress);
  }

  public progress(aggregatorAddress: string): void {
    this._logger.debug(`Dispatching progress event for ${aggregatorAddress}`);
    this.emit('progress', aggregatorAddress);
  }

  public transmit(aggregatorAddress: string, reportToTransmit: IAttestedReport): void {
    this._logger.debug(
      `Dispatching transmit event for ${aggregatorAddress} with report ${reportToTransmit.epoch}/${reportToTransmit.round}`
    );
    this.emit('transmit', aggregatorAddress, reportToTransmit);
  }
}
