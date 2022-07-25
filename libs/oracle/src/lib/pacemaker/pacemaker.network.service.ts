import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TypedEmitter } from 'tiny-typed-emitter';
import { NodeService } from '../node.service.js';
import { Message } from '@libp2p/interface-pubsub';
import { PeerId } from '@libp2p/interface-peer-id';

export interface IPacemakerEvents {
  newEpoch: (from: PeerId, newEpochMessage: INewEpochMessage) => {};
}

export interface INewEpochMessage {
  aggregatorAddress: string;
  newEpoch: number;
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
      this._onPubSubMessage(msg);
    });
  }

  private _onPubSubMessage(msg: CustomEvent<Message>): void {
    switch (msg.detail.topic) {
      case this._topic:
        this._handleNewEpoch(msg);
        break;
      default:
        return;
    }
  }

  private _handleNewEpoch(msg: CustomEvent<Message>): void {
    const peerId = msg.detail.from;
    const newEpochMessage = PacemakerNetworkService._deserializeNewEpochMessage(msg.detail.data);
    this._logger.debug(`Received newEpoch from ${peerId}: ${JSON.stringify(newEpochMessage)}`);

    this.emit('newEpoch', peerId, newEpochMessage);
  }

  public async broadcastNewEpoch(newEpochMessage: INewEpochMessage): Promise<void> {
    this._logger.debug(`Sending newEpoch: ${JSON.stringify(newEpochMessage)}`);
    const serialized = PacemakerNetworkService._serializeNewEpochMessage(newEpochMessage);
    await this._nodeService.node.pubsub.publish(this._topic, serialized);
  }

  private static _serializeNewEpochMessage(newEpochMessage: INewEpochMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        newEpoch: newEpochMessage.newEpoch,
        aggregatorAddress: newEpochMessage.aggregatorAddress
      })
    );
  }

  private static _deserializeNewEpochMessage(newEpochMessage: Uint8Array): INewEpochMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(newEpochMessage));

    return {
      newEpoch: parsed.newEpoch,
      aggregatorAddress: parsed.aggregatorAddress
    };
  }
}
