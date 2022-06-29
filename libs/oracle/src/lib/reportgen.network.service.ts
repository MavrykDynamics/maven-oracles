import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TypedEmitter } from 'tiny-typed-emitter';
import { NodeService } from './node.service.js';
import { Message } from '@libp2p/interface-pubsub';
import BigNumber from 'bignumber.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { Connection, Stream } from '@libp2p/interfaces/dist/src/connection/index.js';
import { pipe } from 'it-pipe';
import { decode, encode } from 'it-length-prefixed';
import { OracleConfig } from './oracle.config.js';

export interface IReportGenEvents {
  observe: (from: PeerId, observeMessage: IObserveMessage) => {};
  observeReq: (from: PeerId, round: number) => {};
  reportReq: (from: PeerId, reportReqMessage: IReportReqMessage) => {};
  report: (from: PeerId, reportMessage: IReportMessage) => {};
  final: (from: PeerId, finalMessage: IFinalMessage) => {};
  finalEcho: (from: PeerId, finalEchoMessage: IFinalEchoMessage) => {};
}

interface IObserveMessage {
  round: number;
  observation: BigNumber;
  signature: Uint8Array;
}

interface IFinalMessage {
  round: number;
  attestedReport: IAttestedReport;
}

interface IFinalEchoMessage {
  round: number;
  attestedReport: IAttestedReport;
}

export interface ISignedObservation {
  oracle: string;
  price: BigNumber;
  signature: Uint8Array;
}

export interface IObservation {
  oracle: string;
  price: BigNumber;
}

export interface IReport {
  observations: ISignedObservation[];
}
export interface ICompressedReport {
  observations: IObservation[];
}

export interface IAttestedReport {
  observations: IObservation[];
  signatures: Uint8Array[];
}

interface IReportMessage {
  round: number;
  compressedReport: ICompressedReport;
  signature: Uint8Array;
}
interface IReportReqMessage {
  round: number;
  report: IReport;
}

@Injectable()
export class ReportGenNetworkService extends TypedEmitter<IReportGenEvents> implements OnModuleInit {
  private readonly _logger: Logger = new Logger(ReportGenNetworkService.name);
  private readonly _observeReqTopic: string = 'observeReq';
  private readonly _reportReqTopic: string = 'reportReq';
  private readonly _finalTopic: string = 'final';
  private readonly _finalEchoTopic: string = 'finalEcho';
  private readonly _observeProtocol: string = '/observe/1.0.0';
  private readonly _reportProtocol: string = '/report/1.0.0';

  // PeerId of currently running oralce
  private _self: string;

  public constructor(private readonly _nodeService: NodeService, private readonly _config: OracleConfig) {
    super();
    this._self = this._config.peerId;
  }

  public async onModuleInit(): Promise<void> {
    await this._nodeService.node.pubsub.subscribe(this._observeReqTopic);
    await this._nodeService.node.pubsub.subscribe(this._reportReqTopic);
    await this._nodeService.node.pubsub.subscribe(this._finalTopic);
    await this._nodeService.node.pubsub.subscribe(this._finalEchoTopic);
    await this._nodeService.node.pubsub.addEventListener('message', (msg: CustomEvent<Message>) => {
      this._onPubSubMessage(msg);
    });
    await this._nodeService.node.handle(this._observeProtocol, ({ stream, connection }) =>
      this.onObserve(stream, connection)
    );
    await this._nodeService.node.handle(this._reportProtocol, ({ stream, connection }) =>
      this.onReport(stream, connection)
    );

    // if (this._nodeService.node.peerId.toString() !== '12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1') {
    //   await this.sendObserve(
    //     await createFromJSON({
    //       id: '12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1'
    //     }),
    //     {
    //       round: 0,
    //       observation: new BigNumber(1),
    //       signature: this._nodeService.node.peerId.toString()
    //     }
    //   );
    // }
  }

  private _onPubSubMessage(msg: CustomEvent<Message>): void {
    switch (msg.detail.topic) {
      case this._observeReqTopic:
        this._handleObserveReq(msg);
        break;
      case this._reportReqTopic:
        this._handleReportReq(msg);
        break;
      case this._finalTopic:
        this._handleFinal(msg);
        break;
      case this._finalEchoTopic:
        this._handleFinalEcho(msg);
        break;
      default:
        return;
    }
  }

  private _handleObserveReq(msg: CustomEvent<Message>): void {
    const peerId = msg.detail.from;
    const decoder = new TextDecoder();
    const data = decoder.decode(msg.detail.data);
    const round = Number.parseInt(data);
    this._logger.debug(`Received observeReq from ${peerId} with round: ${round}`);

    this.emit('observeReq', peerId, round);
  }

  private _handleReportReq(msg: CustomEvent<Message>): void {
    const peerId = msg.detail.from;
    const reportReqMessage = ReportGenNetworkService._deserializeReportReqMessage(msg.detail.data);
    this._logger.debug(
      `Received reportReq from ${peerId} with round: ${reportReqMessage.round}, report: ${JSON.stringify(
        reportReqMessage.report
      )}`
    );

    this.emit('reportReq', peerId, reportReqMessage);
  }

  private _handleFinal(msg: CustomEvent<Message>): void {
    const peerId = msg.detail.from;
    const finalMessage = ReportGenNetworkService._deserializeFinalMessage(msg.detail.data);
    this._logger.debug(
      `Received final from ${peerId} with round: ${finalMessage.round}, report: ${JSON.stringify(
        finalMessage.attestedReport
      )}`
    );

    this.emit('final', peerId, finalMessage);
  }

  private _handleFinalEcho(msg: CustomEvent<Message>): void {
    const peerId = msg.detail.from;
    const finalEchoMessage = ReportGenNetworkService._deserializeFinalEchoMessage(msg.detail.data);
    this._logger.debug(
      `Received finalEcho from ${peerId} with round: ${finalEchoMessage[0]}, report: ${finalEchoMessage[1]}`
    );

    this.emit('finalEcho', peerId, finalEchoMessage);
  }

  public async broadcastObserveReq(round: number): Promise<void> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(round.toString());

    this._logger.debug(`Sending observeReq: ${round}`);
    await this._nodeService.node.pubsub.publish(this._observeReqTopic, encodedData);
  }

  public async broadcastFinalEcho(round: number, attestedReport: IAttestedReport): Promise<void> {
    const serialized = ReportGenNetworkService._serializeFinalEchoMessage({
      round,
      attestedReport
    });

    this._logger.debug(`Sending finalEcho: ${round}`);
    await this._nodeService.node.pubsub.publish(this._finalEchoTopic, serialized);
  }

  public async broadcastFinal(round: number, attestedReport: IAttestedReport): Promise<void> {
    const serialized = ReportGenNetworkService._serializeFinalMessage({
      round,
      attestedReport
    });

    this._logger.debug(`Sending final: ${round}`);
    await this._nodeService.node.pubsub.publish(this._finalTopic, serialized);
  }

  public async sendObserve(to: PeerId, observeMessage: IObserveMessage): Promise<void> {
    this._logger.debug(`Sending observe: with observeMessage: ${JSON.stringify(observeMessage)}`);

    if (to.toString() === this._self) {
      this.emit('observe', to, observeMessage);
      return;
    }

    const serialized = ReportGenNetworkService._serializeObserveMessage(observeMessage);
    const { stream } = await this._nodeService.node.dialProtocol(to, this._observeProtocol);
    await pipe([serialized], encode(), stream);
    stream.close();
  }

  public async onObserve(stream: Stream, connection: Connection): Promise<void> {
    await pipe(stream.source, decode(), async (source) => {
      for await (const serializedObservationMessage of source) {
        try {
          const observeMessage = ReportGenNetworkService._deserializeObserveMessage(
            serializedObservationMessage
          );
          this._logger.debug(
            `Received observe from ${connection.remotePeer.toString()}: ${JSON.stringify(observeMessage)}`
          );
          this.emit('observe', connection.remotePeer, observeMessage);
        } catch (e) {
          // TODO: handle errors
          this._logger.error(e.toString());
        }
      }
    });
  }

  public async sendReport(to: PeerId, reportMessage: IReportMessage): Promise<void> {
    this._logger.debug(`Sending report: with reportMessage: ${JSON.stringify(reportMessage)}`);

    if (to.toString() === this._self) {
      this.emit('report', to, reportMessage);
      return;
    }

    const serialized = ReportGenNetworkService._serializeReportMessage(reportMessage);
    const { stream } = await this._nodeService.node.dialProtocol(to, this._reportProtocol);
    await pipe([serialized], encode(), stream);
    stream.close();
  }

  public async onReport(stream: Stream, connection: Connection): Promise<void> {
    await pipe(stream.source, decode(), async (source) => {
      for await (const serializedReportMessage of source) {
        try {
          const reportMessage = ReportGenNetworkService._deserializeReportMessage(serializedReportMessage);
          this._logger.debug(
            `Received report from ${connection.remotePeer.toString()}: ${JSON.stringify(reportMessage)}`
          );
          this.emit('report', connection.remotePeer, reportMessage);
        } catch (e) {
          // TODO: handle errors
          this._logger.error(e.toString());
        }
      }
    });
  }

  public async broadcastReportReq(round: number, report: IReport): Promise<void> {
    const serialized = ReportGenNetworkService._serializeReportReqMessage({
      round,
      report
    });
    this._logger.debug(`Sending reportReq: ${round}, report: ${JSON.stringify(report)}`);
    await this._nodeService.node.pubsub.publish(this._reportReqTopic, serialized);
  }

  private static _serializeObserveMessage(observeMessage: IObserveMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        round: observeMessage.round,
        observation: observeMessage.observation,
        signature: Array.from(observeMessage.signature.values())
      })
    );
  }

  private static _deserializeObserveMessage(observeMessage: Uint8Array): IObserveMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(observeMessage));

    return {
      round: parsed.round,
      observation: new BigNumber(parsed.observation),
      signature: Uint8Array.from(parsed.signature)
    };
  }

  private static _serializeReportMessage(observeMessage: IReportMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        round: observeMessage.round,
        compressedReport: observeMessage.compressedReport,
        signature: Array.from(observeMessage.signature.values())
      })
    );
  }

  private static _deserializeReportMessage(observeMessage: Uint8Array): IReportMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(observeMessage));

    return {
      round: parsed.round,
      compressedReport: parsed.compressedReport,
      signature: Uint8Array.from(parsed.signature)
    };
  }

  private static _serializeReportReqMessage(reportMessage: IReportReqMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(JSON.stringify(reportMessage));
  }

  private static _deserializeReportReqMessage(report: Uint8Array): IReportReqMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(report));

    // TODO: typecheck

    return parsed;
  }

  private static _serializeFinalMessage(reportMessage: IFinalMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(JSON.stringify(reportMessage));
  }

  private static _deserializeFinalMessage(report: Uint8Array): IFinalMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(report));

    // TODO: typecheck

    return parsed;
  }

  private static _serializeFinalEchoMessage(reportMessage: IFinalEchoMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(JSON.stringify(reportMessage));
  }

  private static _deserializeFinalEchoMessage(report: Uint8Array): IFinalEchoMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(report));

    // TODO: typecheck

    return parsed;
  }
}
