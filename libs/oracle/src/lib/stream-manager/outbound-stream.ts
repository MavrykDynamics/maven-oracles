import { Stream } from '@libp2p/interface-connection';
import { pushable, Pushable } from 'it-pushable';
import { pipe } from 'it-pipe';
import { abortableSource } from 'abortable-iterator';
import { encode } from 'it-length-prefixed';

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
    this._pushable.return();
    this._rawStream.close();
  }

  public id(): string {
    return this._rawStream.id;
  }
}
