/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { createRequire } from 'module';

// eslint-disable-next-line @rushstack/typedef-var
const require = createRequire(import.meta.url);

// eslint-disable-next-line @rushstack/typedef-var
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
  alphaPercentPerThousand: BigNumber;
  percentOracleThreshold: BigNumber;
  heartBeatSeconds: BigNumber;
  rewardAmountXtz: BigNumber;
  rewardAmountStakedMvk: BigNumber;
};

export type OracleLastResultType = {
  round: BigNumber;
  epoch: BigNumber;
  data: BigNumber;
  percentOracleResponse: BigNumber;
  lastUpdatedAt: string;
};

export interface IOracleInformation {
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

  admin                     : string;
  metadata                  : MichelsonMap<string, unknown>;
  name                      : string;
  config                    : {

      decimals                            : BigNumber;
      alphaPercentPerThousand             : BigNumber;

      percentOracleThreshold              : BigNumber;
      heartBeatSeconds                    : BigNumber;
      
      rewardAmountXtz                     : BigNumber;
      rewardAmountStakedMvk               : BigNumber;
  };

  breakGlassConfig          : {
      updateDataIsPaused                 : boolean;
      withdrawRewardXtzIsPaused           : boolean;
      withdrawRewardStakedMvkIsPaused     : boolean;
  };

  mvkTokenAddress           : string;
  governanceAddress         : string;

  whitelistContracts        : MichelsonMap<string, unknown>;
  generalContracts          : MichelsonMap<string, unknown>;

  oracleLedger           : MichelsonMap<string, IOracleInformation>;
  
  lastCompletedData         : OracleLastResultType;

  oracleRewardStakedMvk     : MichelsonMap<string, unknown>;
  oracleRewardXtz           : MichelsonMap<string, unknown>;

  lambdaLedger              : MichelsonMap<string, unknown>;
};

type AggregatorContractMethods<T extends ContractProvider | Wallet> = {
  setAdmin: (admin: string) => ContractMethod<T>;
  setGovernance: (governance: string) => ContractMethod<T>;
  setName: (name: string) => ContractMethod<T>;
  updateMetadata: (key: string, bytes: string) => ContractMethod<T>;
  updateConfig: (value: number, config: string) => ContractMethod<T>;
  updateWhitelistContracts: (contract: number, address: string) => ContractMethod<T>;
  updateGeneralContracts: (contract: number, address: string) => ContractMethod<T>;
  mistakenTransfer: (transfers: Array<any>) => ContractMethod<T>;
  addOracle: (oracleAddress: string) => ContractMethod<T>;
  updateOracle: () => ContractMethod<T>;
  removeOracle: (oracleAddress: string) => ContractMethod<T>;
  pauseAll: () => ContractMethod<T>;
  unpauseAll: () => ContractMethod<T>;
  togglePauseEntrypoint: (entrypoint: string, pause: boolean) => ContractMethod<T>;
  updateData: (oracleObservations: MichelsonMap<string, unknown>, signatures: MichelsonMap<string, unknown>) => ContractMethod<T>;
  withdrawRewardXtz: (address: string) => ContractMethod<T>;
  withdrawRewardStakedMvk: (address: string) => ContractMethod<T>;
  setLambda: (name: string, func_bytes: string) => ContractMethod<T>;
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
