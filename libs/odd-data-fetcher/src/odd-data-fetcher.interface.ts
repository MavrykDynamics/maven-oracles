import BigNumber from 'bignumber.js';

export interface IOddDataFetcher {
  getData(key: string): Promise<BigNumber>;
}