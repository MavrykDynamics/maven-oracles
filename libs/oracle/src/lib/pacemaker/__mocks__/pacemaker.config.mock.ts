import { IPacemakerConfig } from '../pacemaker.config.js';
import { mockedOracleAddresses } from '../../contract/__mocks__/contract.service.mock.js';

export const PacemakerConfigMock: IPacemakerConfig = {
  aggregatorAddress: 'aggregatorAddressMock',
  aggregatorPair: ['TEST', 'USD'],
  timerProgressDurationMiliseconds: 1000,
  timerResendDurationMiliseconds: 2000
};
