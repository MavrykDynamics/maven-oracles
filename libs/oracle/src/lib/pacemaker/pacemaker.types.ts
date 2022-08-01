import { PeerId } from '@libp2p/interface-peer-id';

export interface IPacemakerEvents {
  newEpoch: (from: PeerId, newEpochMessage: INewEpochMessage) => {};
}

export interface INewEpochMessage {
  aggregatorAddress: string;
  newEpoch: number;
}
