/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { createRequire } from 'module';

// eslint-disable-next-line @rushstack/typedef-var
const require = createRequire(import.meta.url);

// eslint-disable-next-line @rushstack/typedef-var
const AggregatorRaw = require('./contracts/json/aggregatorFactory.json');

import { MichelsonMap, MichelsonMapKey } from '@taquito/michelson-encoder';
import { OnChainView } from '@taquito/taquito/dist/types/contract/contract-methods/contract-on-chain-view';
import {
  ContractAbstraction,
  ContractMethod,
  ContractMethodObject,
  ContractProvider,
  ContractView,
  Wallet
} from '@taquito/taquito';
import BigNumber from 'bignumber.js';

export const AggregatorFactoryCode: any = AggregatorRaw.michelson;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type IPair = { 0: string; 1: string };

export type IAggregatorFactoryStorage = MichelsonMap<IPair, string>;

type AggregatorFactoryContractMethods<T extends ContractProvider | Wallet> = {
  createAggregator: (
    pair1: string,
    pair2: string,
    alphaPercentPerThousand: BigNumber,
    decimals: BigNumber,
    heartBeatSeconds: BigNumber,
    oracleAddresses: MichelsonMap<MichelsonMapKey, unknown>
  ) => ContractMethod<T>;
};

type AggregatorFactoryContractMethodObject<T extends ContractProvider | Wallet> = Record<
  string,
  (...args: unknown[]) => ContractMethodObject<T>
>;

type AggregatorFactoryViews = Record<string, (...args: unknown[]) => ContractView>;

type AggregatorFactoryOnChainViews = {
  decimals: () => OnChainView;
};

export type AggregatorFactoryContractAbstraction<T extends ContractProvider | Wallet = any> =
  ContractAbstraction<
    T,
    AggregatorFactoryContractMethods<T>,
    AggregatorFactoryContractMethodObject<T>,
    AggregatorFactoryViews,
    AggregatorFactoryOnChainViews,
    IAggregatorFactoryStorage
  >;
