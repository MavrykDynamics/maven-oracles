/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
import { MichelsonMap } from '@taquito/michelson-encoder';
import BigNumber from 'bignumber.js';
import { ContractAbstraction } from '@taquito/taquito';
import { ContractProvider } from '@taquito/taquito/dist/types/contract/interface';
import { Wallet } from '@taquito/taquito/dist/types/wallet';
import { ContractMethod } from '@taquito/taquito/dist/types/contract/contract-methods/contract-method-flat-param';
import { ContractMethodObject } from '@taquito/taquito/dist/types/contract/contract-methods/contract-method-object-param';
import { OnChainView } from '@taquito/taquito/dist/types/contract/contract-methods/contract-on-chain-view';
import { ContractView } from '@taquito/taquito/dist/types/contract/contract';

export interface OraclePriceResponsesForPackValue {
  oracleSignature: string;
  oracleObservation_price: BigNumber;
  oracleObservation_address: string;
}

export interface OraclePriceResponsesValue {
  oracleSignature: string;
  priceSalted: (string | BigNumber)[];
}

export interface OracleInformation {
  oraclePublicKey: string;
  oraclePeerId: string;
}

export interface OracleObservationType {
  price: BigNumber;
  epoch: BigNumber;
  round: BigNumber;
}

export interface AggregatorStorage {
  oracleAddresses: MichelsonMap<string, OracleInformation>;
  lastResult: OracleObservationType;
}

// interface oraclePriceResponseType {
//     priceSalted_price: BigNumber,
//     priceSalted_salt: string,
//     priceSalted_address: string,
//     oracleSignature: string
// }

// interface AggregatorContractMethods<T extends ContractProvider | Wallet> {

//   verify: (
//     oraclePriceResponses: Map<string, oraclePriceResponseType>, // map (address, oraclePriceResponseType)
//     priceSalted_price: Map<string, string> // map (address, signature)
//   ) => ContractMethod<T>;
// }

// type AggregatorContractMethodObject<T extends ContractProvider | Wallet> =
//   Record<string, (...args: any[]) => ContractMethodObject<T>>;

// type AggregatorViews = Record<string, (...args: any[]) => ContractView>;

// interface AggregatorOnChainViews {}

// export type AggregatorContractAbstraction<
//   T extends ContractProvider | Wallet = any
// > = ContractAbstraction<
//   T,
//   AggregatorContractMethods<T>,
//   AggregatorContractMethodObject<T>,
//   AggregatorViews,
//   AggregatorOnChainViews,
//   AggregatorStorage
// >;
