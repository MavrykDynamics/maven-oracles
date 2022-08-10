import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Message } from '@libp2p/interface-pubsub';
import BigNumber from 'bignumber.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { OracleConfig } from '../oracle.config.js';
import { NodeService } from '../node.service.js';
import { StreamManagerService } from '../stream-manager/index.js';
import {
  IFinalMessage,
  IReportReqMessage,
  IObserveMessage,
  IReportMessage,
  IObserveReqMessage,
  IFinalEchoMessage
} from './reportgen.types.js';
import { IReportGenEvents } from './reportgen.types.js';

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
      this._logger.debug(`Creating inbound stream for ${this._observeProtocol}`);
      await this._streamManagerService.createInboundStream(
        this._observeProtocol,
        connection.remotePeer,
        stream,
        (data, peerId) => this.onObserve(data, peerId)
      );
    });
    await this._nodeService.node.handle(this._reportProtocol, async ({ stream, connection }) => {
      this._logger.debug(`Creating inbound stream for ${this._reportProtocol}`);
      await this._streamManagerService.createInboundStream(
        this._reportProtocol,
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
    const observeReqMessage = ReportGenNetworkService.deserializeObserveReqMessage(msg.detail.data);
    this._logger.debug(`Received observeReq from ${peerId}: ${JSON.stringify(observeReqMessage)}`);

    this.emit('observeReq', peerId, observeReqMessage);
  }

  private _handleReportReq(msg: CustomEvent<Message>): void {
    const peerId = msg.detail.from;
    const reportReqMessage = ReportGenNetworkService.deserializeReportReqMessage(msg.detail.data);
    this._logger.debug(
      `Received reportReq from ${peerId} with report: ${JSON.stringify(reportReqMessage.report)}`
    );

    this.emit('reportReq', peerId, reportReqMessage);
  }

  private _handleFinal(msg: CustomEvent<Message>): void {
    const peerId = msg.detail.from;
    const finalMessage = ReportGenNetworkService.deserializeFinalMessage(msg.detail.data);
    this._logger.debug(
      `Received final from ${peerId} with report: ${JSON.stringify(finalMessage.attestedReport)}`
    );

    this.emit('final', peerId, finalMessage);
  }

  private _handleFinalEcho(msg: CustomEvent<Message>): void {
    const peerId = msg.detail.from;
    const finalEchoMessage = ReportGenNetworkService.deserializeFinalEchoMessage(msg.detail.data);
    this._logger.debug(
      `Received finalEcho from ${peerId} with report: ${JSON.stringify(finalEchoMessage.attestedReport)}`
    );

    this.emit('finalEcho', peerId, finalEchoMessage);
  }

  public async broadcastObserveReq(observeReqMessage: IObserveReqMessage): Promise<void> {
    this._logger.debug(`Sending observeReq: ${JSON.stringify(observeReqMessage)}`);

    const serialized = ReportGenNetworkService.serializeObserveReqMessage(observeReqMessage);

    await this._nodeService.node.pubsub.publish(this._observeReqTopic, serialized);
  }

  public async broadcastFinalEcho(finalEchoMessage: IFinalEchoMessage): Promise<void> {
    const serialized = ReportGenNetworkService.serializeFinalEchoMessage(finalEchoMessage);

    await this._nodeService.node.pubsub.publish(this._finalEchoTopic, serialized);
  }

  public async broadcastFinal(finalMessage: IFinalMessage): Promise<void> {
    const serialized = ReportGenNetworkService.serializeFinalMessage(finalMessage);

    await this._nodeService.node.pubsub.publish(this._finalTopic, serialized);
  }

  public async sendObserve(to: PeerId, observeMessage: IObserveMessage): Promise<void> {
    this._logger.debug(`Sending observe message to ${to.toString()}: ${JSON.stringify(observeMessage)}`);

    if (to.toString() === this._self) {
      this.emit('observe', to, observeMessage);
      return;
    }

    const serialized = ReportGenNetworkService.serializeObserveMessage(observeMessage);
    const outboundStream = await this._streamManagerService.getOutboundStream(this._observeProtocol, to);
    outboundStream.push(serialized);
  }

  public async onObserve(data: Uint8Array, peerId: PeerId): Promise<void> {
    try {
      const observeMessage = ReportGenNetworkService.deserializeObserveMessage(data);
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

    const serialized = ReportGenNetworkService.serializeReportMessage(reportMessage);
    try {
      const outboundStream = await this._streamManagerService.getOutboundStream(this._reportProtocol, to);
      outboundStream.push(serialized);
    } catch (e) {
      this._logger.error(`Could not send report to ${to}: ${e.toString()}`);
    }
  }

  public async onReport(data: Uint8Array, peerId: PeerId): Promise<void> {
    try {
      const reportMessage = ReportGenNetworkService.deserializeReportMessage(data);
      this._logger.debug(`Received report from ${peerId.toString()}: ${JSON.stringify(reportMessage)}`);
      this.emit('report', peerId, reportMessage);
    } catch (e) {
      // TODO: handle errors
      this._logger.error(e.toString());
    }
  }

  public async broadcastReportReq(reportReqMessage: IReportReqMessage): Promise<void> {
    const serialized = ReportGenNetworkService.serializeReportReqMessage(reportReqMessage);
    await this._nodeService.node.pubsub.publish(this._reportReqTopic, serialized);
  }

  public static serializeObserveMessage(observeMessage: IObserveMessage): Uint8Array {
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

  public static deserializeObserveMessage(observeMessage: Uint8Array): IObserveMessage {
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

  public static serializeReportMessage(reportMessage: IReportMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        aggregatorAddress: reportMessage.aggregatorAddress,
        compressedReport: reportMessage.compressedReport,
        signature: reportMessage.signature
      })
    );
  }

  public static deserializeReportMessage(reportMessage: Uint8Array): IReportMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(reportMessage));

    return {
      ...parsed,
      compressedReport: {
        ...parsed.compressedReport,
        observations: parsed.compressedReport.observations.map((ob) => ({
          ...ob,
          price: new BigNumber(ob.price)
        }))
      }
    };
  }

  public static serializeObserveReqMessage(observeReqMessage: IObserveReqMessage): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(
      JSON.stringify({
        aggregatorAddress: observeReqMessage.aggregatorAddress,
        round: observeReqMessage.round
      })
    );
  }

  public static deserializeObserveReqMessage(observeReqMessage: Uint8Array): IObserveReqMessage {
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(observeReqMessage));

    return {
      aggregatorAddress: parsed.aggregatorAddress,
      round: parsed.round
    };
  }

  public static serializeReportReqMessage(reportReqMessage: IReportReqMessage): Uint8Array {
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

  public static deserializeReportReqMessage(reportReq: Uint8Array): IReportReqMessage {
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

  public static serializeFinalMessage(finalMessage: IFinalMessage): Uint8Array {
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

  public static deserializeFinalMessage(finalMessage: Uint8Array): IFinalMessage {
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

  public static serializeFinalEchoMessage(finalEchoMessage: IFinalEchoMessage): Uint8Array {
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

  public static deserializeFinalEchoMessage(finalEchoMessage: Uint8Array): IFinalEchoMessage {
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
