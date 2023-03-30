import { IOracleInformations } from '@mavrykdynamics/contracts';

export interface IPacemakerConfig {
  aggregatorAddress: string;
  aggregatorPair: [string, string];
  timerProgressDurationMiliseconds: number;
  timerResendDurationMiliseconds: number;
  oracleLedger: IOracleInformations[];
}
