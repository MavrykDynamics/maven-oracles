import BigNumber from 'bignumber.js';
import { IOracleInformations } from '@mavrykdynamics/contracts';

export interface IReportGenConfig {
  epoch: number;
  leader: string;
  aggregatorAddress: string;
  aggregatorPair: [string, string];
  alphaPerThousand: BigNumber; // 0.2% - 0.5% recommended by OCR white paper
  heartbeatSeconds: BigNumber; // 5m - 24h recommended by OCR white paper
  oracleAddresses: IOracleInformations[];
}
