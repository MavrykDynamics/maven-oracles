import BigNumber from 'bignumber.js';

export interface IDataFetcher {
  getData([pair1, pair2]: [string, string]): Promise<BigNumber>;
}
