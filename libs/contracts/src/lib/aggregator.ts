/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { createRequire } from 'module';

// eslint-disable-next-line @rushstack/typedef-var
const require = createRequire(import.meta.url);

// eslint-disable-next-line @rushstack/typedef-var
const AggregatorRaw = require('./contracts/json/aggregator.json');

import { MichelsonMap, MichelsonMapKey } from '@mavrykdynamics/taquito-michelson-encoder';
import BigNumber from 'bignumber.js';
import {
  ContractAbstraction,
  ContractMethod,
  ContractMethodObject,
  ContractProvider,
  ContractView,
  Wallet
} from '@mavrykdynamics/taquito';
import { OnChainView } from '@mavrykdynamics/taquito/dist/types/contract/contract-methods/contract-on-chain-view';

export const AggregatorCode: any = AggregatorRaw.michelson;
export type AggregatorConfigType = {

    decimals                            : BigNumber;
    alphaPercentPerThousand             : BigNumber;

    percentOracleThreshold              : BigNumber;
    heartbeatSeconds                    : BigNumber;
    
    rewardAmountXtz                     : BigNumber;
    rewardAmountStakedMvn               : BigNumber;

};

export type OracleLastResultType = {
    round                 : BigNumber;
    epoch                 : BigNumber;
    data                  : BigNumber;
    percentOracleResponse : BigNumber;
    lastUpdatedAt         : string;
};

export interface IOracleInformationType {
  oraclePublicKey: string;
  oraclePeerId: string;
}

export interface IOracleLastResultType {
  round: BigNumber;
  epoch: BigNumber;
  data: BigNumber;
  percentOracleResponse: BigNumber;
  lastUpdatedAt: string;
}

export interface IOracleObservationType {
  data: BigNumber;
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
  
    admin                       : string;
    metadata                    : MichelsonMap<MichelsonMapKey, unknown>;
    name                        : string;
    config                      : AggregatorConfigType;

    breakGlassConfig            : {
        updateDataIsPaused                  : boolean;
        withdrawRewardXtzIsPaused           : boolean;
        withdrawRewardStakedMvnIsPaused     : boolean;
    };

    mvnTokenAddress             : string;
    governanceAddress           : string;

    whitelistContracts          : MichelsonMap<MichelsonMapKey, unknown>;
    generalContracts            : MichelsonMap<MichelsonMapKey, unknown>;

    oracleLedger                : MichelsonMap<string, IOracleInformationType>;
    
    lastCompletedData           : OracleLastResultType;

    oracleRewardStakedMvn       : MichelsonMap<MichelsonMapKey, unknown>;
    oracleRewardXtz             : MichelsonMap<MichelsonMapKey, unknown>;

    lambdaLedger                : MichelsonMap<MichelsonMapKey, unknown>;
};

type AggregatorContractMethods<T extends ContractProvider | Wallet> = {
  setAdmin: (admin: string) => ContractMethod<T>;
  setGovernance: (governance: string) => ContractMethod<T>;
  setName: (name: string) => ContractMethod<T>;
  updateMetadata: (key: string, bytes: string) => ContractMethod<T>;
  updateConfig: (value: number, config: string) => ContractMethod<T>;
  updateWhitelistContracts: (whitelistContractAddress: string, updateType: string) => ContractMethod<T>;
  updateGeneralContracts: (generalContractName: string, generalContractAddress: string, updateType: string) => ContractMethod<T>;
  mistakenTransfer: (transfers: Array<any>) => ContractMethod<T>;
  addOracle: (oracleAddress: string) => ContractMethod<T>;
  updateOracle: () => ContractMethod<T>;
  removeOracle: (oracleAddress: string) => ContractMethod<T>;
  pauseAll: () => ContractMethod<T>;
  unpauseAll: () => ContractMethod<T>;
  togglePauseEntrypoint: (entrypoint: string, pause: boolean) => ContractMethod<T>;
  updateData: (oracleObservations: MichelsonMap<string, unknown>, signatures: MichelsonMap<string, unknown>) => ContractMethod<T>;
  withdrawRewardXtz: (address: string) => ContractMethod<T>;
  withdrawRewardStakedMvn: (address: string) => ContractMethod<T>;
  setLambda: (name: string, func_bytes: string) => ContractMethod<T>;
};

type AggregatorContractMethodObject<T extends ContractProvider | Wallet> = Record<
  string,
  (...args: unknown[]) => ContractMethodObject<T>
>;

type AggregatorViews = Record<string, (...args: unknown[]) => ContractView>;

type AggregatorOnChainViews = {
    getAdmin: () => OnChainView;
    getName: () => OnChainView;
    getConfig: () => OnChainView;
    getBreakGlassConfig: () => OnChainView;
    getGovernanceAddress: () => OnChainView;
    getWhitelistContractOpt: () => OnChainView;
    getGeneralContractOpt: () => OnChainView;
    getOracleLedger: () => OnChainView;
    getOracleOpt: () => OnChainView;
    getOracleRewardStakedMvnOpt: () => OnChainView;
    getOracleRewardXtzOpt: () => OnChainView;
    getLastCompletedData: () => OnChainView;
    getDecimals: () => OnChainView;
    getContractName: () => OnChainView;
    getLambdaOpt: () => OnChainView;
};

export type AggregatorContractAbstraction<T extends ContractProvider | Wallet = any> = ContractAbstraction<
  T,
  AggregatorContractMethods<T>,
  AggregatorContractMethodObject<T>,
  AggregatorViews,
  AggregatorOnChainViews,
  IAggregatorStorage
>;
