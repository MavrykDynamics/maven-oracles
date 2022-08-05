import { IOracleInformations } from '@tezosdynamics/contracts';

export interface IPacemakerConfig {
  aggregatorAddress: string;
  aggregatorPair: [string, string];
  timerProgressDurationMiliseconds: number;
  timerResendDurationMiliseconds: number;
  oracleAddresses: IOracleInformations[];
}
