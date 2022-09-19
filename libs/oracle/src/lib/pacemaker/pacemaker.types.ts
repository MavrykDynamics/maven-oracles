import { PeerId } from '@libp2p/interface-peer-id';

export interface IPacemakerEvents {
  newEpoch: (from: PeerId, newEpochMessage: INewEpochMessage) => {};
}

export interface INewEpochMessage {
  aggregatorAddress: string;
  newEpoch: number;
}

export interface IPaceMakerState {
  epoch: number | undefined; // Can be null before initialization
  leader: string | undefined; // Can be null before initialization
  newEpoch: number;
  peersNewEpoch: Map<string, number>;
}
