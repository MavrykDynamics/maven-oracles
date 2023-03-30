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
export type IAggregatorFactoryStorage = {
  admin                     : string;
  metadata                  : MichelsonMap<MichelsonMapKey, unknown>;
  breakGlassConfig          : {
      createAggregatorIsPaused              : boolean;
      trackAggregatorIsPaused               : boolean;
      untrackAggregatorIsPaused             : boolean;
      distributeRewardXtzIsPaused           : boolean;
      distributeRewardStakedMvkIsPaused     : boolean;
  };
  config                    : {
      aggregatorNameMaxLength               : BigNumber;
  }

  generalContracts          : MichelsonMap<MichelsonMapKey, unknown>;
  whitelistContracts        : MichelsonMap<MichelsonMapKey, unknown>;

  mvkTokenAddress           : string;
  governanceAddress         : string;
  
  trackedAggregators        : Array<string>;

  lambdaLedger              : MichelsonMap<MichelsonMapKey, unknown>;
  aggregatorLambdaLedger    : MichelsonMap<MichelsonMapKey, unknown>;
};

type AggregatorFactoryContractMethods<T extends ContractProvider | Wallet> = {
  createAggregator: (
    name: string,
    addToGeneralContracts: boolean,
    oracleLedger: MichelsonMap<MichelsonMapKey, unknown>,
    decimals: BigNumber,
    alphaPercentPerThousand: BigNumber,
    percentOracleThreshold: BigNumber,
    heartBeatSeconds: BigNumber,
    rewardAmountStakedMvk: BigNumber,
    rewardAmountXtz: BigNumber,
    metadata: MichelsonMap<MichelsonMapKey, unknown>
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
