/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { createRequire } from 'module';

// eslint-disable-next-line @rushstack/typedef-var
const require = createRequire(import.meta.url);

// eslint-disable-next-line @rushstack/typedef-var
const MavenLiteRaw = require('./contracts/json/mavenLite.json');

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

export const MavenLiteCode: any = MavenLiteRaw.michelson;
export type MavenLiteConfigType = {
    minimumStakedMvnBalance             : BigNumber;
    delegationRatio                     : BigNumber;
    maxSatellites                       : BigNumber;
    satelliteNameMaxLength              : BigNumber;
    satelliteDescriptionMaxLength       : BigNumber;
    satelliteImageMaxLength             : BigNumber;
    satelliteWebsiteMaxLength           : BigNumber;
};

export type IMavenLiteStorage = {

    config                  : MavenLiteConfigType;
    generalContracts        : MichelsonMap<MichelsonMapKey, unknown>;
    satelliteLedger         : MichelsonMap<MichelsonMapKey, unknown>;

};

type MavenLiteContractMethods<T extends ContractProvider | Wallet> = {
    distributeReward: (eligibleSatellites: Array<string>, totalStakedMvnReward: number) => ContractMethod<T>;
    setAggregatorReference: (aggregatorAddress: string, oldName: string, newName: string) => ContractMethod<T>;
    updateGeneralContracts: (generalContractName: string, generalContractAddress: string, updateType: string) => ContractMethod<T>;
    transfer: (transfers: Array<any>) => ContractMethod<T>;
};

type MavenLiteContractMethodObject<T extends ContractProvider | Wallet> = Record<
  string,
  (...args: unknown[]) => ContractMethodObject<T>
>;

type MavenLiteViews = Record<string, (...args: unknown[]) => ContractView>;

type MavenLiteOnChainViews = {
    getConfig: () => OnChainView;
    getGeneralContractOpt: () => OnChainView;
    getSatelliteOpt: () => OnChainView;
};

export type MavenLiteContractAbstraction<T extends ContractProvider | Wallet = any> = ContractAbstraction<
  T,
  MavenLiteContractMethods<T>,
  MavenLiteContractMethodObject<T>,
  MavenLiteViews,
  MavenLiteOnChainViews,
  IMavenLiteStorage
>;
