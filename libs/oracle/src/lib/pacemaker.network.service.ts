import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TypedEmitter } from 'tiny-typed-emitter';
import { NodeService } from './node.service.js';
import { Message } from '@libp2p/interface-pubsub';
import { PeerId } from '@libp2p/interface-peer-id';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';

export interface IPacemakerEvents {
  newEpoch: (from: PeerId, newEpoch: number) => {};
}

@Injectable()
export class PacemakerNetworkService extends TypedEmitter<IPacemakerEvents> implements OnModuleInit {
  private readonly _logger: Logger = new Logger(PacemakerNetworkService.name);
  private readonly _topic: string = 'newEpoch';

  public constructor(private readonly _nodeService: NodeService) {
    super();
  }

  public async onModuleInit(): Promise<void> {
    await this._nodeService.node.pubsub.subscribe(this._topic);
    await this._nodeService.node.pubsub.addEventListener('message', (msg: CustomEvent<Message>) => {
      if (msg.detail.topic !== this._topic) {
        return;
      }
      const peerId = msg.detail.from;
      const decoder = new TextDecoder();
      const data = decoder.decode(msg.detail.data);
      const epoch = Number.parseInt(data);

      this._logger.debug(`Received newEpoch: ${epoch} from ${peerId}`);

      this.emit('newEpoch', peerId, epoch);
    });
  }

  public async broadcastNewEpoch(epoch: number) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(epoch.toString());

    this._logger.debug(`Sending newEpoch: ${epoch}`);
    await this._nodeService.node.pubsub.publish(this._topic, encodedData);
  }
}
