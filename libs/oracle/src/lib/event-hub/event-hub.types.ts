import { IAttestedReport } from '../reportgen';
import { IOracleInformations } from '@tezosdynamics/contracts';
import BigNumber from 'bignumber.js';

export interface IEventHubEvents {
  startepoch: (aggregatorAddress: string, epoch: number, leader: string) => void;
  progress: (aggregatorAddress: string) => void;
  transmit: (
    aggregatorAddress: string,
    oracleAddresses: IOracleInformations[],
    reportToTransmit: IAttestedReport,
    alphaPerThousand: BigNumber // Necessary since transmit service need to check for deviation
  ) => void;
  changeLeader: (aggregatorAddress: string) => void;
}
