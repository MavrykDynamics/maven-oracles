import { Injectable, Logger } from '@nestjs/common';
import { TypedEmitter } from 'tiny-typed-emitter';
import { IAttestedReport, IReport } from './reportgen.network.service.js';

interface IEvents {
  startepoch: (epoch: number, leader: string) => void;
  progress: () => void;
  transmit: (epoch: number, round: number, reportToTransmit: IAttestedReport) => void;
  changeleader: () => void;
  stopReportGen: (epoch: number, leader: string) => void;
  startReportGen: (start: number, leader: string) => void;
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

  public stopReportGen(epoch: number, leader: string): void {
    this.emit('stopReportGen', epoch, leader);
  }

  public startReportGen(epoch: number, leader: string): void {
    this.emit('startReportGen', epoch, leader);
  }

  public progress(): void {
    this.emit('progress');
  }

  public transmit(epoch: number, round: number, reportToTransmit: IAttestedReport): void {
    // TODO: add report ??
    this.emit('transmit', epoch, round, reportToTransmit);
  }
}
