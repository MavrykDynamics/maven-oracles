import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TypedEmitter } from 'tiny-typed-emitter';
import { NodeService } from '../node.service.js';
import { Message } from '@libp2p/interface-pubsub';
import { INewEpochMessage, IPacemakerEvents } from './pacemaker.types.js';
import { getLogger } from '../logger.js';
import { Logger } from 'winston';

@Injectable()
export class PacemakerNetworkService
  extends TypedEmitter<IPacemakerEvents>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: PacemakerNetworkService.name
    }
  });
  private readonly _topic: string = 'newEpoch';
  private readonly _messageListener: any = this._onPubSubMessage.bind(this);

  public constructor(private readonly _nodeService: NodeService) {
    super();
  }

  public async onModuleInit(): Promise<void> {
    await this._nodeService.node.pubsub.subscribe(this._topic);
    await this._nodeService.node.pubsub.addEventListener('message', this._messageListener);
  }

  public async onModuleDestroy(): Promise<void> {
    await this._nodeService.node.pubsub.unsubscribe(this._topic);
    await this._nodeService.node.pubsub.removeEventListener('message', this._messageListener);
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
    if (msg.detail.type !== 'signed') {
      this._logger.warn('Received unsigned message, discarding');
      return;
    }
    const peerId = msg.detail.from;
    const newEpochMessage = PacemakerNetworkService.deserializeNewEpochMessage(msg.detail.data);
    this._logger.debug(`Received newEpoch from ${peerId}: ${JSON.stringify(newEpochMessage)}`);

    this.emit('newEpoch', peerId, newEpochMessage);
  }

  public async broadcastNewEpoch(newEpochMessage: INewEpochMessage): Promise<void> {
    this._logger.debug(`Sending newEpoch: ${JSON.stringify(newEpochMessage)}`);
    const serialized = PacemakerNetworkService.serializeNewEpochMessage(newEpochMessage);
    await this._nodeService.node.pubsub.publish(this._topic, serialized);
  }

  public static serializeNewEpochMessage(newEpochMessage: INewEpochMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        newEpoch: newEpochMessage.newEpoch,
        aggregatorAddress: newEpochMessage.aggregatorAddress
      })
    );
  }

  public static deserializeNewEpochMessage(newEpochMessage: Uint8Array): INewEpochMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(newEpochMessage));

    return {
      newEpoch: parsed.newEpoch,
      aggregatorAddress: parsed.aggregatorAddress
    };
  }
}
