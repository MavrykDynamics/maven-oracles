import { mockedOracleAddresses } from '../../contract/__mocks__/contract.service.mock.js';
import { IReportGenConfig } from '../reportgen.config.js';
import BigNumber from 'bignumber.js';

export const ReportGenConfigMock: IReportGenConfig = {
  aggregatorAddress: 'aggregatorAddressMock',
  aggregatorPair: ['TEST', 'USD'],
  oracleAddresses: mockedOracleAddresses,
  alpha: new BigNumber(600),
  heartbeatSeconds: new BigNumber(1000),
  epoch: 2,
  leader: mockedOracleAddresses[3].oraclePeerId
};
