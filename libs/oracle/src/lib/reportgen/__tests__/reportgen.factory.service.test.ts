import { beforeEach, jest } from '@jest/globals';
import { ContractServiceMock } from '../../contract/__mocks__/contract.service.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import { EventHubService } from '../../event-hub/index.js';
import { ContractService } from '../../contract/index.js';
import { ReportGenNetworkService } from '../../reportgen/index.js';
import { ReportGenNetworkServiceMock } from '../__mocks__/reportgen.network.service.mock.js';
import { DataService } from '../../data/index.js';
import { DataServiceMock } from '../../data/__mocks__/data.service.mock.js';
import {
  mockStop as mockStopLeader,
  ReportGenLeaderServiceMock
} from '../__mocks__/reportgen.leader.service.mock.js';
import {
  mockStop as mockStopFollower,
  ReportGenFollowerServiceMock
} from '../__mocks__/reportgen.follower.service.mock.js';
import { ReportGenConfigMock } from '../__mocks__/reportgen.config.mock.js';

jest.unstable_mockModule('../reportgen.leader.service.js', async () => ({
  ReportGenLeaderService: ReportGenLeaderServiceMock
}));

jest.unstable_mockModule('../reportgen.follower.service.js', async () => ({
  ReportGenFollowerService: ReportGenFollowerServiceMock
}));

// Use async import to make sure we get the one that use mocks
const { ReportGenFactoryService } = await import('../reportgen.factory.service.js');

describe('ReportGenFactoryService', () => {
  // @ts-expect-error
  let reportGenFactoryService: ReportGenFactoryService;
  const reportgenNetworkServiceMock = new ReportGenNetworkServiceMock();
  const eventHubServiceMock = new EventHubService();
  const contractServiceMock = new ContractServiceMock();
  const priceServiceMock = new DataServiceMock();

  beforeEach(async () => {
    reportGenFactoryService = new ReportGenFactoryService(
      OracleConfigMock,
      reportgenNetworkServiceMock as unknown as ReportGenNetworkService,
      eventHubServiceMock as unknown as EventHubService,
      contractServiceMock as unknown as ContractService,
      priceServiceMock as unknown as DataService
    );
  });

  describe('startReportGen', () => {
    test('should instantiate a new ReportGenFollowerService', () => {
      reportGenFactoryService.startReportGen(ReportGenConfigMock);

      expect(ReportGenFollowerServiceMock).toHaveBeenCalledTimes(1);
      expect(ReportGenFollowerServiceMock).toHaveBeenCalledWith(
        OracleConfigMock,
        reportgenNetworkServiceMock,
        eventHubServiceMock,
        contractServiceMock,
        priceServiceMock,
        ReportGenConfigMock
      );
    });

    test('should instantiate a new ReportGenLeaderService if oracle is the leader', () => {
      reportGenFactoryService.startReportGen(ReportGenConfigMock);

      expect(ReportGenLeaderServiceMock).toHaveBeenCalledTimes(1);
      expect(ReportGenLeaderServiceMock).toHaveBeenCalledWith(
        OracleConfigMock,
        reportgenNetworkServiceMock,
        eventHubServiceMock,
        contractServiceMock,
        ReportGenConfigMock
      );
    });

    test('should not should instantiate a new ReportGenLeaderService if oracle is not the leader', () => {
      reportGenFactoryService.startReportGen({
        ...ReportGenConfigMock,
        leader: 'notTheOracle'
      });

      expect(ReportGenLeaderServiceMock).not.toHaveBeenCalled();
    });

    test('should throw if trying to twice a ReportGenFollowerService for the same aggregator', () => {
      reportGenFactoryService.startReportGen(ReportGenConfigMock);
      expect(() => reportGenFactoryService.startReportGen(ReportGenConfigMock)).toThrow();
    });
  });

  describe('stopReportGen', () => {
    test('should call stop on ReportGenFollowerService', () => {
      reportGenFactoryService.startReportGen(ReportGenConfigMock);
      reportGenFactoryService.stopReportGen(ReportGenConfigMock.aggregatorAddress);

      expect(mockStopFollower).toHaveBeenCalledTimes(1);
    });

    test('should call stop on ReportGenLeaderService', () => {
      reportGenFactoryService.startReportGen(ReportGenConfigMock);
      reportGenFactoryService.stopReportGen(ReportGenConfigMock.aggregatorAddress);

      expect(mockStopLeader).toHaveBeenCalledTimes(1);
    });
  });
});
