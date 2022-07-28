import { MichelsonMap } from '@taquito/michelson-encoder';

export interface IPairType {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  0: string;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  1: string;
}
export type IAggregatorFactoryStorage = MichelsonMap<IPairType, string>;
