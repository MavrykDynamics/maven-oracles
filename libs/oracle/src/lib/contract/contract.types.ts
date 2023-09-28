import BigNumber from 'bignumber.js';

export interface IAggregatorConfig {
  decimals: BigNumber;
  alphaPercentPerThousand: BigNumber;
  percentOracleThreshold: BigNumber;
  heartbeatSeconds: BigNumber;
  rewardAmountXtz: BigNumber;
  rewardAmountStakedMvk: BigNumber;
}
