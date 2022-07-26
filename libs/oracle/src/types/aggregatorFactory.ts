import { MichelsonMap } from '@taquito/michelson-encoder';

export type PairType = { 0: string; 1: string };
export type IAggregatorFactoryStorage = MichelsonMap<PairType, string>;
