import { PeerId } from '@libp2p/interface-peer-id';
import BigNumber from 'bignumber.js';

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
