import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { Stream } from '@libp2p/interface-connection';
import { abortableSource } from 'abortable-iterator';
import { pipe } from 'it-pipe';
import { pushable, Pushable } from 'it-pushable';
import { decode, encode } from 'it-length-prefixed';
import { PeerId } from '@libp2p/interface-peer-id';
import { NodeService } from './node.service.js';

import { Mutex } from 'async-mutex';

export class OutboundStream {
  private readonly _rawStream: Stream;
  private readonly _pushable: Pushable<Uint8Array>;
  private readonly _closeController: AbortController;

  public constructor(rawStream: Stream, errCallback: (e: Error) => void) {
    this._rawStream = rawStream;
    this._pushable = pushable();
    this._closeController = new AbortController();

    pipe(
      abortableSource(this._pushable, this._closeController.signal, { returnOnAbort: true }),
      encode(),
      this._rawStream
    ).catch(errCallback);
  }

  public get protocol(): string {
    // TODO remove this non-nullish assertion after https://github.com/libp2p/js-libp2p-interfaces/pull/265 is incorporated
    return this._rawStream.stat.protocol!;
  }

  public push(data: Uint8Array): void {
    this._pushable.push(data);
  }

  public close(): void {
    this._closeController.abort();
    this._rawStream.close();
  }
}

export class InboundStream {
  public readonly source: AsyncIterable<Uint8Array>;

  private readonly _rawStream: Stream;
  private readonly _closeController: AbortController;

  public constructor(rawStream: Stream) {
    this._rawStream = rawStream;
    this._closeController = new AbortController();

    this.source = abortableSource(pipe(this._rawStream, decode()), this._closeController.signal, {
      returnOnAbort: true
    });
  }

  public close(): void {
    this._closeController.abort();
    this._rawStream.close();
  }
}

@Injectable()
export class StreamManagerService implements OnModuleDestroy {
  private readonly _logger: Logger = new Logger(StreamManagerService.name);

  private readonly _streamsInbound: Map<string, Map<string, InboundStream>> = new Map();
  private readonly _streamsOutbound: Map<string, Map<string, OutboundStream>> = new Map();
  private readonly _streamsOutboundCreationMutex: Mutex = new Mutex();

  public constructor(private readonly _nodeService: NodeService) {
    this._streamsInbound.set('/observe/1.0.0', new Map<string, InboundStream>());
    this._streamsInbound.set('/report/1.0.0', new Map<string, InboundStream>());
    this._streamsOutbound.set('/observe/1.0.0', new Map<string, OutboundStream>());
    this._streamsOutbound.set('/report/1.0.0', new Map<string, OutboundStream>());
  }

  public onModuleDestroy(): void {
    this._logger.debug('Closing streams');
    for (const streams of this._streamsInbound.values()) {
      for (const stream of streams.values()) {
        stream.close();
      }
      streams.clear();
    }
    this._streamsInbound.clear();
    for (const streams of this._streamsOutbound.values()) {
      for (const stream of streams.values()) {
        stream.close();
      }
      streams.clear();
    }
    this._streamsOutbound.clear();
  }

  public async createInboundStream(
    protocol: string,
    peerId: PeerId,
    stream: Stream,
    handler: (data: Uint8Array, peerId: PeerId) => Promise<void>
  ): Promise<void> {
    const id = peerId.toString();

    // TODO make this behavior more robust
    // This behavior is different than for outbound streams
    // If a peer initiates a new inbound connection
    // we assume that one is the new canonical inbound stream
    const priorInboundStream = this._streamsInbound.get(protocol)?.get(id);
    if (priorInboundStream !== undefined) {
      this._logger.debug('replacing existing inbound steam %s', id);
      priorInboundStream.close();
    }

    this._logger.debug('create inbound stream %s', id);

    const inboundStream = new InboundStream(stream);
    this._streamsInbound.get(protocol)?.set(id, inboundStream);

    try {
      await pipe(inboundStream.source, async (source) => {
        for await (const data of source) {
          try {
            await handler(data, peerId);
          } catch (err) {
            this._logger.error('createInboundStream1', err);
          }
        }
        this._logger.log('MANIA - source is closed ?');
      }).finally(() => inboundStream.close());
    } catch (err) {
      this._logger.error('createInboundStream2', err);
    }
  }

  public async getOutboundStream(protocol: string, peerId: PeerId): Promise<OutboundStream> {
    const id = peerId.toString();
    // TODO make this behavior more robust
    // This behavior is different than for inbound streams
    // If an outbound stream already exists, don't create a new stream

    return await this._streamsOutboundCreationMutex.runExclusive(async () => {
      const found = this._streamsOutbound.get(protocol)?.get(id);
      if (found !== undefined) {
        this._logger.debug(`MANIA - outbound stream already exist for ${protocol}/${id}`);
        return found;
      }

      try {
        this._logger.debug(`MANIA - BEFORE create outbound stream for ${protocol}/${id}`);
        const stream = new OutboundStream(await this._nodeService.node.dialProtocol(peerId, protocol), (e) =>
          this._logger.error('outbound pipe error', e)
        );
        this._logger.debug(`MANIA - AFTER create outbound stream for ${protocol}/${id}`);

        this._streamsOutbound.get(protocol)?.set(id, stream);

        return stream;
      } catch (e) {
        this._logger.error('createOutboundStream error', e);
        throw e;
      }
    });
  }
}
