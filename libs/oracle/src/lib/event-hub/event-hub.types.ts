import { IAttestedReport } from '../reportgen';

export interface IEventHubEvents {
  startepoch: (aggregatorAddress: string, epoch: number, leader: string) => void;
  progress: (aggregatorAddress: string) => void;
  transmit: (aggregatorAddress: string, reportToTransmit: IAttestedReport) => void;
  changeleader: (aggregatorAddress: string) => void;
}
