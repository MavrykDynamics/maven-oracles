import {
  ContractServiceMock,
  mockedLastBlockchainReportEpoch
} from '../../contract/__mocks__/contract.service.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
// Import this named export into your test file:
import { PacemakerService } from '../pacemaker.service.js';
import { PacemakerNetworkServiceMock } from '../__mocks__/pacemaker.network.service.mock.js';
import { EventHubServiceMock } from '../../event-hub/__mocks__/event-hub.mock.js';
import { ReportgenFactoryServiceMock } from '../../reportgen/__mocks__/reportgen.factory.service.mock.js';
import { PacemakerConfigMock } from '../__mocks__/pacemaker.config.mock.js';

describe('PacemakerService', () => {
  let pacemakerService: PacemakerService;
  const pacemakerNetworkServiceMock = new PacemakerNetworkServiceMock();
  const eventHubServiceMock = new EventHubServiceMock();
  const contractServiceMock = new ContractServiceMock();
  const reportGenFactoryMock = new ReportgenFactoryServiceMock();

  beforeEach(async () => {
    pacemakerService = new PacemakerService(
      OracleConfigMock,
      pacemakerNetworkServiceMock,
      eventHubServiceMock,
      contractServiceMock,
      reportGenFactoryMock,
      PacemakerConfigMock
    );
  });

  describe('initialize', () => {
    test('should initialize state correctly', async () => {
      await pacemakerService.initialize();

      expect(pacemakerService.getState()).toEqual({
        epoch: mockedLastBlockchainReportEpoch,
        leader: undefined,
        newEpoch: mockedLastBlockchainReportEpoch,
        peersNewEpoch: new Map()
      });
    });
  });
});
