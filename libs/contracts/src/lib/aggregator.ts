/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import * as AggregatorRaw from './contracts/json/aggregator.json';
import { MichelsonMap } from '@taquito/michelson-encoder';
import BigNumber from 'bignumber.js';
import { ContractAbstraction } from '@taquito/taquito';
import { ContractProvider } from '@taquito/taquito/dist/types/contract/interface';
import { Wallet } from '@taquito/taquito/dist/types/wallet';
import { ContractMethod } from '@taquito/taquito/dist/types/contract/contract-methods/contract-method-flat-param';
import { ContractMethodObject } from '@taquito/taquito/dist/types/contract/contract-methods/contract-method-object-param';
import { OnChainView } from '@taquito/taquito/dist/types/contract/contract-methods/contract-on-chain-view';
import { ContractView } from '@taquito/taquito/dist/types/contract/contract';

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
  price : BigNumber;
  epoch : BigNumber;
  round : BigNumber;
  time : string;
};
export type AggregatorStorage = {
  oracleAddresses: MichelsonMap<string, string>;
  lastResult  : OracleLastResultType;
  heartBeatSeconds : BigNumber;
  alphaPercentPerThousand : BigNumber;
  decimals : BigNumber;
};

type AggregatorContractMethods<T extends ContractProvider | Wallet> = {
  requestRateUpdate: () => ContractMethod<T>;
  requestRateUpdateDeviation: (
    round: BigNumber,
    sign: string
  ) => ContractMethod<T>;
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

type AggregatorContractMethodObject<T extends ContractProvider | Wallet> =
  Record<string, (...args: unknown[]) => ContractMethodObject<T>>;

type AggregatorViews = Record<string, (...args: unknown[]) => ContractView>;

type AggregatorOnChainViews = {
  decimals: () => OnChainView;
};

export type AggregatorContractAbstraction<
  T extends ContractProvider | Wallet = any
> = ContractAbstraction<
  T,
  AggregatorContractMethods<T>,
  AggregatorContractMethodObject<T>,
  AggregatorViews,
  AggregatorOnChainViews,
  AggregatorStorage
>;
