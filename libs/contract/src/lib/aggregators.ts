import { MichelsonMap } from '@taquito/michelson-encoder';
import BigNumber from 'bignumber.js';
import { ContractAbstraction } from '@taquito/taquito';
import { ContractProvider } from '@taquito/taquito/dist/types/contract/interface';
import { Wallet } from '@taquito/taquito/dist/types/wallet';
import { ContractMethod } from '@taquito/taquito/dist/types/contract/contract-methods/contract-method-flat-param';
import { ContractMethodObject } from '@taquito/taquito/dist/types/contract/contract-methods/contract-method-object-param';
import { OnChainView } from '@taquito/taquito/dist/types/contract/contract-methods/contract-on-chain-view';
import { ContractView } from '@taquito/taquito/dist/types/contract/contract';


export type OraclePriceResponsesForPackValue = {
  oracleSignature: string,
  oracleObservation_price: BigNumber, 
  oracleObservation_address: string
}

export type OraclePriceResponsesValue = {
  oracleSignature: string,
  priceSalted: (string | BigNumber)[]
}

export type AggregatorStorage = {
  oracleAddresses: MichelsonMap<string, string>;
  lastPrice:BigNumber;
};

type oraclePriceResponseType = {
    priceSalted_price: BigNumber,
    priceSalted_salt: String,
    priceSalted_address: String,
    oracleSignature: String
}

type AggregatorContractMethods<T extends ContractProvider | Wallet> = {

  verify: (
    oraclePriceResponses: Map<string, oraclePriceResponseType>, // map (address, oraclePriceResponseType)
    priceSalted_price: Map<string, string> // map (address, signature)
  ) => ContractMethod<T>;
};

type AggregatorContractMethodObject<T extends ContractProvider | Wallet> =
  Record<string, (...args: any[]) => ContractMethodObject<T>>;

type AggregatorViews = Record<string, (...args: any[]) => ContractView>;

type AggregatorOnChainViews = {};

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