import { mockedOracleAddresses } from '../../contract/__mocks__/contract.service.mock.js';
import { IReportGenConfig } from '../reportgen.config.js';
import BigNumber from 'bignumber.js';

export const ReportGenConfigMock: IReportGenConfig = {
  aggregatorAddress: 'aggregatorAddressMock',
  aggregatorPair: ['TEST', 'USD'],
  oracleAddresses: mockedOracleAddresses,
  alphaPerThousand: new BigNumber(200),
  heartbeatSeconds: new BigNumber(1000),
  epoch: 3,
  leader: mockedOracleAddresses[3].oraclePeerId
};
