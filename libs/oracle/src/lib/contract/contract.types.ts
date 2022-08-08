import BigNumber from 'bignumber.js';

export interface IAggregatorConfig {
  heartBeatSeconds: BigNumber;
  decimals: BigNumber;
  alphaPercentPerThousand: BigNumber;
}
