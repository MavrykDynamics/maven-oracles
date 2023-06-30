/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { createRequire } from 'module';

// eslint-disable-next-line @rushstack/typedef-var
const require = createRequire(import.meta.url);

// eslint-disable-next-line @rushstack/typedef-var
const MavrykLiteRaw = require('./contracts/json/mavrykLite.json');

import { MichelsonMap, MichelsonMapKey } from '@taquito/michelson-encoder';
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

export const MavrykLiteCode: any = MavrykLiteRaw.michelson;
export type MavrykLiteConfigType = {
    minimumStakedMvkBalance             : BigNumber;
    delegationRatio                     : BigNumber;
    maxSatellites                       : BigNumber;
    satelliteNameMaxLength              : BigNumber;
    satelliteDescriptionMaxLength       : BigNumber;
    satelliteImageMaxLength             : BigNumber;
    satelliteWebsiteMaxLength           : BigNumber;
};

export type IMavrykLiteStorage = {

    config                  : MavrykLiteConfigType;
    generalContracts        : MichelsonMap<MichelsonMapKey, unknown>;
    satelliteLedger         : MichelsonMap<MichelsonMapKey, unknown>;

};

type MavrykLiteContractMethods<T extends ContractProvider | Wallet> = {
    distributeReward: (eligibleSatellites: Array<string>, totalStakedMvkReward: number) => ContractMethod<T>;
    setAggregatorReference: (aggregatorAddress: string, oldName: string, newName: string) => ContractMethod<T>;
    updateGeneralContracts: (generalContractName: string, generalContractAddress: string, updateType: string) => ContractMethod<T>;
    transfer: (transfers: Array<any>) => ContractMethod<T>;
};

type MavrykLiteContractMethodObject<T extends ContractProvider | Wallet> = Record<
  string,
  (...args: unknown[]) => ContractMethodObject<T>
>;

type MavrykLiteViews = Record<string, (...args: unknown[]) => ContractView>;

type MavrykLiteOnChainViews = {
    getConfig: () => OnChainView;
    getGeneralContractOpt: () => OnChainView;
    getSatelliteOpt: () => OnChainView;
};

export type MavrykLiteContractAbstraction<T extends ContractProvider | Wallet = any> = ContractAbstraction<
  T,
  MavrykLiteContractMethods<T>,
  MavrykLiteContractMethodObject<T>,
  MavrykLiteViews,
  MavrykLiteOnChainViews,
  IMavrykLiteStorage
>;
