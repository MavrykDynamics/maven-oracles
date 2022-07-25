import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Message } from '@libp2p/interface-pubsub';
import BigNumber from 'bignumber.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { Connection, Stream } from '@libp2p/interface-connection';
import { pipe } from 'it-pipe';
import { decode } from 'it-length-prefixed';
import { OracleConfig } from '../oracle.config.js';
import { NodeService } from '../node.service.js';
import { StreamManagerService } from '../stream-manager.service.js';

export interface IReportGenEvents {
  observe: (from: PeerId, observeMessage: IObserveMessage) => {};
  observeReq: (from: PeerId, round: IObserveReqMessage) => {};
  reportReq: (from: PeerId, reportReqMessage: IReportReqMessage) => {};
  report: (from: PeerId, reportMessage: IReportMessage) => {};
  final: (from: PeerId, finalMessage: IFinalMessage) => {};
  finalEcho: (from: PeerId, finalEchoMessage: IFinalEchoMessage) => {};
}

export interface IObserveMessage {
  aggregatorAddress: string;
  epoch: number;
  round: number;
  observation: BigNumber;
  signature: Uint8Array;
}

export interface IFinalMessage {
  aggregatorAddress: string;
  attestedReport: IAttestedReport;
}

export interface IFinalEchoMessage {
  aggregatorAddress: string;
  attestedReport: IAttestedReport;
}

export interface ISignedObservation {
  oracle: string;
  price: BigNumber;
  signature: Uint8Array;
}

export interface IObserveReqMessage {
  aggregatorAddress: string;
  round: number;
}

export interface IObservation {
  oracle: string;
  price: BigNumber;
}

export interface ISignature {
  oracle: string;
  signature: string;
}

export interface IReport {
  epoch: number;
  round: number;
  observations: ISignedObservation[];
}

export interface ICompressedReport {
  epoch: number;
  round: number;
  observations: IObservation[];
}

export interface IAttestedReport {
  epoch: number;
  round: number;
  observations: IObservation[];
  signatures: ISignature[];
}

export interface IReportMessage {
  aggregatorAddress: string;
  compressedReport: ICompressedReport;
  signature: ISignature;
}

export interface IReportReqMessage {
  aggregatorAddress: string;
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

  // PeerId of currently running oracle
  private _self: string;

  public constructor(
    private readonly _nodeService: NodeService,
    private readonly _config: OracleConfig,
    private readonly _streamManagerService: StreamManagerService
  ) {
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
    await this._nodeService.node.handle(this._observeProtocol, async ({ stream, connection }) => {
      await this._streamManagerService.createInboundStream(
        this._observeProtocol,
        connection.remotePeer,
        stream,
        (data, peerId) => this.onObserve(data, peerId)
      );
    });
    await this._nodeService.node.handle(this._reportProtocol, async ({ stream, connection }) => {
      await this._streamManagerService.createInboundStream(
        this._observeProtocol,
        connection.remotePeer,
        stream,
        (data, peerId) => this.onReport(data, peerId)
      );
    });

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
    const observeReqMessage = ReportGenNetworkService._deserializeObserveReqMessage(msg.detail.data);
    this._logger.debug(`Received observeReq from ${peerId}: ${JSON.stringify(observeReqMessage)}`);

    this.emit('observeReq', peerId, observeReqMessage);
  }

  private _handleReportReq(msg: CustomEvent<Message>): void {
    const peerId = msg.detail.from;
    const reportReqMessage = ReportGenNetworkService._deserializeReportReqMessage(msg.detail.data);
    this._logger.debug(
      `Received reportReq from ${peerId} with report: ${JSON.stringify(reportReqMessage.report)}`
    );

    this.emit('reportReq', peerId, reportReqMessage);
  }

  private _handleFinal(msg: CustomEvent<Message>): void {
    const peerId = msg.detail.from;
    const finalMessage = ReportGenNetworkService._deserializeFinalMessage(msg.detail.data);
    this._logger.debug(
      `Received final from ${peerId} with report: ${JSON.stringify(finalMessage.attestedReport)}`
    );

    this.emit('final', peerId, finalMessage);
  }

  private _handleFinalEcho(msg: CustomEvent<Message>): void {
    const peerId = msg.detail.from;
    const finalEchoMessage = ReportGenNetworkService._deserializeFinalEchoMessage(msg.detail.data);
    this._logger.debug(
      `Received finalEcho from ${peerId} with report: ${JSON.stringify(finalEchoMessage.attestedReport)}`
    );

    this.emit('finalEcho', peerId, finalEchoMessage);
  }

  public async broadcastObserveReq(observeReqMessage: IObserveReqMessage): Promise<void> {
    this._logger.debug(`Sending observeReq: ${JSON.stringify(observeReqMessage)}`);

    const serialized = ReportGenNetworkService._serializeObserveReqMessage(observeReqMessage);

    await this._nodeService.node.pubsub.publish(this._observeReqTopic, serialized);
  }

  public async broadcastFinalEcho(finalEchoMessage: IFinalEchoMessage): Promise<void> {
    const serialized = ReportGenNetworkService._serializeFinalEchoMessage(finalEchoMessage);

    await this._nodeService.node.pubsub.publish(this._finalEchoTopic, serialized);
  }

  public async broadcastFinal(finalMessage: IFinalMessage): Promise<void> {
    const serialized = ReportGenNetworkService._serializeFinalMessage(finalMessage);

    await this._nodeService.node.pubsub.publish(this._finalTopic, serialized);
  }

  public async sendObserve(to: PeerId, observeMessage: IObserveMessage): Promise<void> {
    this._logger.debug(`Sending observe: with observeMessage: ${JSON.stringify(observeMessage)}`);

    if (to.toString() === this._self) {
      this.emit('observe', to, observeMessage);
      return;
    }

    const serialized = ReportGenNetworkService._serializeObserveMessage(observeMessage);
    const outboundStream = await this._streamManagerService.getOutboundStream(this._observeProtocol, to);
    outboundStream.push(serialized);
  }

  public async onObserve(data: Uint8Array, peerId: PeerId): Promise<void> {
    try {
      this._logger.log(`MANIA, onObserve from ${peerId.toString()} on ${this._config.aggregatorAddress}`);
      const observeMessage = ReportGenNetworkService._deserializeObserveMessage(data);
      this._logger.debug(`Received observe from ${peerId.toString()}: ${JSON.stringify(observeMessage)}`);
      this.emit('observe', peerId, observeMessage);
    } catch (e) {
      // TODO: handle errors
      this._logger.error(e.toString());
    }
  }

  public async sendReport(to: PeerId, reportMessage: IReportMessage): Promise<void> {
    this._logger.debug(`Sending report: with reportMessage: ${JSON.stringify(reportMessage)}`);

    if (to.toString() === this._self) {
      this.emit('report', to, reportMessage);
      return;
    }

    const serialized = ReportGenNetworkService._serializeReportMessage(reportMessage);
    try {
      const outboundStream = await this._streamManagerService.getOutboundStream(this._reportProtocol, to);
      outboundStream.push(serialized);
    } catch (e) {
      this._logger.error(`Could not send report to ${to}: ${e.toString()}`);
    }
  }

  public async onReport(data: Uint8Array, peerId: PeerId): Promise<void> {
    try {
      const reportMessage = ReportGenNetworkService._deserializeReportMessage(data);
      this._logger.debug(`Received report from ${peerId.toString()}: ${JSON.stringify(reportMessage)}`);
      this.emit('report', peerId, reportMessage);
    } catch (e) {
      // TODO: handle errors
      this._logger.error(e.toString());
    }
  }

  public async broadcastReportReq(reportReqMessage: IReportReqMessage): Promise<void> {
    const serialized = ReportGenNetworkService._serializeReportReqMessage(reportReqMessage);
    await this._nodeService.node.pubsub.publish(this._reportReqTopic, serialized);
  }

  private static _serializeObserveMessage(observeMessage: IObserveMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        aggregatorAddress: observeMessage.aggregatorAddress,
        epoch: observeMessage.epoch,
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
      aggregatorAddress: parsed.aggregatorAddress,
      epoch: parsed.epoch,
      round: parsed.round,
      observation: new BigNumber(parsed.observation),
      signature: Uint8Array.from(parsed.signature)
    };
  }

  private static _serializeReportMessage(reportMessage: IReportMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        aggregatorAddress: reportMessage.aggregatorAddress,
        compressedReport: reportMessage.compressedReport,
        signature: reportMessage.signature
      })
    );
  }

  private static _deserializeReportMessage(reportMessage: Uint8Array): IReportMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(reportMessage));

    return {
      aggregatorAddress: parsed.aggregatorAddress,
      compressedReport: parsed.compressedReport,
      signature: parsed.signature
    };
  }

  private static _serializeObserveReqMessage(observeReqMessage: IObserveReqMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        aggregatorAddress: observeReqMessage.aggregatorAddress,
        round: observeReqMessage.round
      })
    );
  }

  private static _deserializeObserveReqMessage(observeReqMessage: Uint8Array): IObserveReqMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(observeReqMessage));

    return {
      aggregatorAddress: parsed.aggregatorAddress,
      round: parsed.round
    };
  }

  private static _serializeReportReqMessage(reportReqMessage: IReportReqMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        aggregatorAddress: reportReqMessage.aggregatorAddress,
        report: {
          epoch: reportReqMessage.report.epoch,
          round: reportReqMessage.report.round,
          observations: reportReqMessage.report.observations.map((ob) => ({
            oracle: ob.oracle,
            price: new BigNumber(ob.price),
            signature: Array.from(ob.signature.values())
          }))
        }
      })
    );
  }

  private static _deserializeReportReqMessage(reportReq: Uint8Array): IReportReqMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(reportReq));

    return {
      aggregatorAddress: parsed.aggregatorAddress,
      report: {
        epoch: Number.parseInt(parsed.report.epoch),
        round: Number.parseInt(parsed.report.round),
        observations: parsed.report.observations.map((ob) => ({
          oracle: ob.oracle,
          price: new BigNumber(ob.price),
          signature: Uint8Array.from(ob.signature)
        }))
      }
    };
  }

  private static _serializeFinalMessage(finalMessage: IFinalMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        aggregatorAddress: finalMessage.aggregatorAddress,
        attestedReport: {
          epoch: finalMessage.attestedReport.epoch,
          round: finalMessage.attestedReport.round,
          observations: finalMessage.attestedReport.observations.map((ob) => ({
            oracle: ob.oracle,
            price: ob.price.toString()
          })),
          signatures: finalMessage.attestedReport.signatures
        }
      })
    );
  }

  private static _deserializeFinalMessage(finalMessage: Uint8Array): IFinalMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(finalMessage));

    return {
      aggregatorAddress: parsed.aggregatorAddress,
      attestedReport: {
        epoch: Number.parseInt(parsed.attestedReport.epoch),
        round: Number.parseInt(parsed.attestedReport.round),
        observations: parsed.attestedReport.observations.map((ob) => ({
          oracle: ob.oracle,
          price: new BigNumber(ob.price)
        })),
        signatures: parsed.attestedReport.signatures
      }
    };
  }

  private static _serializeFinalEchoMessage(finalEchoMessage: IFinalEchoMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        aggregatorAddress: finalEchoMessage.aggregatorAddress,
        attestedReport: {
          epoch: finalEchoMessage.attestedReport.epoch,
          round: finalEchoMessage.attestedReport.round,
          observations: finalEchoMessage.attestedReport.observations.map((ob) => ({
            oracle: ob.oracle,
            price: ob.price.toString()
          })),
          signatures: finalEchoMessage.attestedReport.signatures
        }
      })
    );
  }

  private static _deserializeFinalEchoMessage(finalEchoMessage: Uint8Array): IFinalEchoMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(finalEchoMessage));
    return {
      aggregatorAddress: parsed.aggregatorAddress,
      attestedReport: {
        epoch: Number.parseInt(parsed.attestedReport.epoch),
        round: Number.parseInt(parsed.attestedReport.round),
        observations: parsed.attestedReport.observations.map((ob) => ({
          oracle: ob.oracle,
          price: new BigNumber(ob.price)
        })),
        signatures: parsed.attestedReport.signatures
      }
    };
  }

  public async getPublicKeyOfPeerId(peerId: PeerId): Promise<Uint8Array> {
    return this._nodeService.node.getPublicKey(peerId);
  }
}
