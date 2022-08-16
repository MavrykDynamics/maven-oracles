import { Stream } from '@libp2p/interface-connection';
import { abortableSource } from 'abortable-iterator';
import { pipe } from 'it-pipe';
import { decode } from 'it-length-prefixed';
import { Uint8ArrayList } from 'uint8arraylist';

export class InboundStream {
  public readonly source: AsyncIterable<Uint8ArrayList>;

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

  public id(): string {
    return this._rawStream.id;
  }
}
