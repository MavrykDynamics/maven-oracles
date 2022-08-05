/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AggregatorRaw = require('./contracts/json/aggregator.json');

import { MichelsonMap } from '@taquito/michelson-encoder';
import BigNumber from 'bignumber.js';
import {
  ContractAbstraction,
  ContractMethod,
  ContractMethodObject,
  ContractProvider,
  ContractView,
  Wallet
} from '@taquito/taquito';
import { OnChainView } from '@taquito/taquito/dist/types/contract/contract-methods/contract-on-chain-view';

export const AggregatorCode: any = AggregatorRaw.michelson;
export type AggregatorConfigType = {
  decimals: BigNumber;
  percentOracleThreshold: BigNumber;
  rewardAmountXTZ: BigNumber;
  rewardAmountMVK: BigNumber;
  minimalTezosAmountDeviationTrigger: BigNumber;
  perthousandDeviationTrigger: BigNumber;
  maintainer: string;
  numberBlocksDelay: BigNumber;
};

export type OracleLastResultType = {
  price: BigNumber;
  epoch: BigNumber;
  round: BigNumber;
  time: string;
};

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

export type IAggregatorStorage = {
  oracleAddresses: MichelsonMap<string, IOracleInformation>;
  lastResult: OracleLastResultType;
  heartBeatSeconds: BigNumber;
  alphaPercentPerThousand: BigNumber;
  decimals: BigNumber;
};

type AggregatorContractMethods<T extends ContractProvider | Wallet> = {
  requestRateUpdate: () => ContractMethod<T>;
  requestRateUpdateDeviation: (round: BigNumber, sign: string) => ContractMethod<T>;
  default: () => ContractMethod<T>;
  addOracle: (oracleAddress: string) => ContractMethod<T>;
  removeOracle: (oracleAddress: string) => ContractMethod<T>;
  setObservationCommit: (round: BigNumber, sign: string) => ContractMethod<T>;
  setObservationReveal: (
    priceSalted_price: BigNumber,
    priceSalted_salt: string,
    round: BigNumber
  ) => ContractMethod<T>;
  updateOwner: (owner: string) => ContractMethod<T>;
  updateAggregatorConfig: (
    decimals: BigNumber,
    maintainer: string,
    minimalTezosAmountDeviationTrigger: BigNumber,
    numberBlocksDelay: BigNumber,
    perthousandDeviationTrigger: BigNumber,
    percentOracleThreshold: BigNumber,
    rewardAmountXTZ: BigNumber,
    rewardAmountMVK: BigNumber
  ) => ContractMethod<T>;
  withdrawRewardXTZ: (address: string) => ContractMethod<T>;
  withdrawRewardMVK: (address: string) => ContractMethod<T>;
};

type AggregatorContractMethodObject<T extends ContractProvider | Wallet> = Record<
  string,
  (...args: unknown[]) => ContractMethodObject<T>
>;

type AggregatorViews = Record<string, (...args: unknown[]) => ContractView>;

type AggregatorOnChainViews = {
  decimals: () => OnChainView;
};

export type AggregatorContractAbstraction<T extends ContractProvider | Wallet = any> = ContractAbstraction<
  T,
  AggregatorContractMethods<T>,
  AggregatorContractMethodObject<T>,
  AggregatorViews,
  AggregatorOnChainViews,
  IAggregatorStorage
>;
