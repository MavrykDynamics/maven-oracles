import { Injectable, Logger } from '@nestjs/common';
import { TypedEmitter } from 'tiny-typed-emitter';

interface IEvents {
  startepoch: (epoch, leader) => {};
  progress: () => {};
  transmit: () => {};
  changeleader: () => {};
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

  public transmit(): void {
    // TODO: add report ??
    this.emit('transmit');
  }
}
