import { MichelsonMap } from '@taquito/michelson-encoder';
import BigNumber from 'bignumber.js';
export interface IOraclePriceResponsesForPackValue {
  oracleSignature: string;
  oracleObservation_price: BigNumber;
  oracleObservation_address: string;
}

export interface IOracleInformation {
  oraclePublicKey: string;
  oraclePeerId: string;
}

export interface IOracleObservationType {
  price: BigNumber;
  epoch: BigNumber;
  round: BigNumber;
  time: BigNumber;
}

export interface IAggregatorStorage {
  oracleAddresses: MichelsonMap<string, IOracleInformation>;
  lastResult: IOracleObservationType;
  heartBeatSeconds: BigNumber;
  decimals: BigNumber;
  alphaPercentPerThousand: BigNumber;
}
