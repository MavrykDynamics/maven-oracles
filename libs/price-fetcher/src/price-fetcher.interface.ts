import BigNumber from 'bignumber.js';

export interface IPriceFetcher {
  getPrice([pair1, pair2]: [string, string]): Promise<BigNumber>;
}
