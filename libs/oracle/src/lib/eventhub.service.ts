import { Injectable, Logger } from '@nestjs/common';
import { TypedEmitter } from 'tiny-typed-emitter';
import { IAttestedReport } from './reportgen/reportgen.network.service.js';

export interface IEvents {
  startepoch: (epoch: number, leader: string) => void;
  progress: () => void;
  transmit: (epoch: number, round: number, reportToTransmit: IAttestedReport) => void;
  changeleader: () => void;
}

@Injectable()
export class EventHubService extends TypedEmitter<IEvents> {
  private readonly _logger: Logger = new Logger(EventHubService.name);

  public constructor() {
    super();
  }

  public startepoch(epoch: number, leader: string): void {
    this.emit('startepoch', epoch, leader);
  }

  public changeleader(): void {
    this.emit('changeleader');
  }

  public progress(): void {
    this.emit('progress');
  }

  public transmit(epoch: number, round: number, reportToTransmit: IAttestedReport): void {
    this.emit('transmit', epoch, round, reportToTransmit);
  }
}
