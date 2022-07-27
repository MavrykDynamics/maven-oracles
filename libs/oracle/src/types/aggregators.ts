import { MichelsonMap } from '@taquito/michelson-encoder';
import BigNumber from 'bignumber.js';

export interface IOracleInformation {
  oraclePublicKey: string;
  oraclePeerId: string;
}

export interface IOracleLastResultType {
  price: BigNumber;
  epoch: BigNumber;
  round: BigNumber;
  time: string;
}

export interface IOracleObservationType {
  price: BigNumber;
  epoch: number;
  round: number;
  aggregatorAddress: string;
}

export interface IOracleInformations {
  oracleAddress: string;
  oraclePublicKey: string;
  oraclePeerId: string;
}

export interface IAggregatorStorage {
  oracleAddresses: MichelsonMap<string, IOracleInformation>;
  lastResult: IOracleLastResultType;
  heartBeatSeconds: BigNumber;
  decimals: BigNumber;
  alphaPercentPerThousand: BigNumber;
}
