/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { createRequire } from 'module';

// eslint-disable-next-line @rushstack/typedef-var
const require = createRequire(import.meta.url);

// eslint-disable-next-line @rushstack/typedef-var
const AggregatorFactoryRaw              = require('./contracts/json/aggregatorFactory.json');
const AggregatorFactoryLambdasRaw: any  = require('./contracts/json/lambdas/aggregatorFactoryLambdas.json');
const AggregatorLambdasRaw: any         = require('./contracts/json/lambdas/aggregatorLambdas.json');

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

export const AggregatorFactoryCode: any     = AggregatorFactoryRaw.michelson;
export const AggregatorFactoryLambdas: any  = AggregatorFactoryLambdasRaw;
export const AggregatorLambdas: any         = AggregatorLambdasRaw;

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
    setAdmin: (admin: string) => ContractMethod<T>;
    setGovernance: (governance: string) => ContractMethod<T>;
    setName: (name: string) => ContractMethod<T>;
    updateMetadata: (key: string, bytes: string) => ContractMethod<T>;
    updateConfig: (value: number, config: string) => ContractMethod<T>;
    updateWhitelistContracts: (whitelistContractAddress: string, updateType: string) => ContractMethod<T>;
    updateGeneralContracts: (generalContractName: string, generalContractAddress: string, updateType: string) => ContractMethod<T>;
    mistakenTransfer: (transfers: Array<any>) => ContractMethod<T>;
    pauseAll: () => ContractMethod<T>;
    unpauseAll: () => ContractMethod<T>;
    togglePauseEntrypoint: (entrypoint: string, pause: boolean) => ContractMethod<T>;
    createAggregator: (
        name: string,
        addToGeneralContracts: boolean,
        oracleLedger: MichelsonMap<MichelsonMapKey, unknown>,
        decimals: BigNumber,
        alphaPercentPerThousand: BigNumber,
        percentOracleThreshold: BigNumber,
        heartbeatSeconds: BigNumber,
        rewardAmountStakedMvk: BigNumber,
        rewardAmountXtz: BigNumber,
        metadata: string
    ) => ContractMethod<T>;
    trackAggregator: (aggregatorAddress: string) => ContractMethod<T>;
    untrackAggregator: (aggregatorAddress: string) => ContractMethod<T>;
    distributeRewardXtz: (recipient: string, reward: number) => ContractMethod<T>;
    distributeRewardStakedMvk: (eligibleSatellites: Array<string>, totalStakedMvkReward: number) => ContractMethod<T>;
    setLambda: (name: string, func_bytes: string) => ContractMethod<T>;
    setProductLambda: (name: string, func_bytes: string) => ContractMethod<T>;
};

type AggregatorFactoryContractMethodObject<T extends ContractProvider | Wallet> = Record<
  string,
  (...args: unknown[]) => ContractMethodObject<T>
>;

type AggregatorFactoryViews = Record<string, (...args: unknown[]) => ContractView>;

type AggregatorFactoryOnChainViews = {
    getAdmin: () => OnChainView;
    getConfig: () => OnChainView;
    getGovernanceAddress: () => OnChainView;
    getWhitelistContractOpt: () => OnChainView;
    getGeneralContractOpt: () => OnChainView;
    getTrackedAggregators: () => OnChainView;
    getLambdaOpt: () => OnChainView;
    getAggregatorLambdaOpt: () => OnChainView;
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
