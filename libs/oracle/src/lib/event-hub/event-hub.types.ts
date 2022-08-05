import { IAttestedReport } from '../reportgen';
import { IOracleInformations } from '@tezosdynamics/contracts';

export interface IEventHubEvents {
  startepoch: (aggregatorAddress: string, epoch: number, leader: string) => void;
  progress: (aggregatorAddress: string) => void;
  transmit: (
    aggregatorAddress: string,
    oracleAddresses: IOracleInformations[],
    reportToTransmit: IAttestedReport
  ) => void;
  changeleader: (aggregatorAddress: string) => void;
}
