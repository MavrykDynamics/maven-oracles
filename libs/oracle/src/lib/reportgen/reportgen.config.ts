import BigNumber from 'bignumber.js';

export interface IReportGenConfig {
  epoch: number;
  leader: string;
  aggregatorAddress: string;
  alpha: BigNumber;
  heartbeatSeconds: BigNumber;
}
