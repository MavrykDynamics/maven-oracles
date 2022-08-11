import { ContractServiceMock } from '../../contract/__mocks__/contract.service.mock.js';
import { EventHubService, IEventHubEvents } from '../../event-hub/index.js';
import { TimerMock } from '../../pacemaker/__mocks__/timer.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import type { ReportGenLeaderService as ReportGenLeaderServiceType } from '../reportgen.leader.service.js';
import { mockBroadcastObserveReq, ReportGenNetworkServiceMock } from '../__mocks__/reportgen.service.mock.js';
import { ReportGenNetworkService } from '../reportgen.network.service.js';
import { ContractService } from '../../contract/index.js';
import { ReportGenConfigMock } from '../__mocks__/reportgen.config.mock.js';
import { jest } from '@jest/globals';
import { IReportGenEvents, Phase } from '../reportgen.types.js';

jest.unstable_mockModule('../../pacemaker/timer.js', async () => ({
  Timer: TimerMock
}));

// Use async import to make sure we get the mocked one
const { ReportGenLeaderService } = await import('../reportgen.leader.service.js');

describe('PacemakerService', () => {
  let reportGenLeaderService: ReportGenLeaderServiceType;
  let timerRound: any;
  let timerGrace: any;

  let onObserve: IReportGenEvents['observe'];
  let onReport: IReportGenEvents['report'];
  let onStartEpoch: IEventHubEvents['startepoch'];

  const reportGenNetworkServiceMock = new ReportGenNetworkServiceMock();
  const eventHubServiceMock = new EventHubService();
  const contractServiceMock: any = new ContractServiceMock();

  beforeEach(async () => {
    reportGenLeaderService = new ReportGenLeaderService(
      OracleConfigMock,
      reportGenNetworkServiceMock as unknown as ReportGenNetworkService,
      eventHubServiceMock as unknown as EventHubService,
      contractServiceMock as unknown as ContractService,
      ReportGenConfigMock
    );

    // Dirty tricks to avoid errors due to properties/methods being private

    // @ts-expect-error
    timerRound = reportGenLeaderService._timerRound;
    // @ts-expect-error
    timerGrace = reportGenLeaderService._timerGrace;

    // @ts-expect-error
    onObserve = reportGenLeaderService._onObserveHandle.bind(reportGenLeaderService);

    // @ts-expect-error
    onReport = reportGenLeaderService._onReport.bind(reportGenLeaderService);

    // @ts-expect-error
    onStartEpoch = reportGenLeaderService._onStartEpoch.bind(reportGenLeaderService);
  });

  afterEach(async () => {
    await reportGenLeaderService.stop();
    jest.clearAllMocks();
  });

  describe('on startepoch event', () => {
    test('should initialize state correctly', async () => {
      await onStartEpoch(
        ReportGenConfigMock.aggregatorAddress,
        ReportGenConfigMock.epoch,
        ReportGenConfigMock.leader
      );

      expect(reportGenLeaderService.getState()).toEqual({
        epoch: ReportGenConfigMock.epoch,
        leader: ReportGenConfigMock.leader,
        round: 1,
        observe: new Map(),
        reports: new Map(),
        phase: Phase.Observe
      });
    });

    test('should broadcast observe req', async () => {
      await onStartEpoch(
        ReportGenConfigMock.aggregatorAddress,
        ReportGenConfigMock.epoch,
        ReportGenConfigMock.leader
      );

      expect(mockBroadcastObserveReq).toHaveBeenCalledTimes(1);
      expect(mockBroadcastObserveReq).toHaveBeenCalledWith({
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        round: 1
      });
    });

    test('should restart round timer', async () => {
      await onStartEpoch(
        ReportGenConfigMock.aggregatorAddress,
        ReportGenConfigMock.epoch,
        ReportGenConfigMock.leader
      );

      expect(timerRound.restart).toHaveBeenCalledTimes(1);
    });

    test('should silently ignore when aggregator address is not the one in the config', async () => {
      await onStartEpoch('NotTheAggregatorAddress', ReportGenConfigMock.epoch, ReportGenConfigMock.leader);

      expect(mockBroadcastObserveReq).not.toHaveBeenCalled();
    });

    test('should silently ignore when epoch is not the one in the config', async () => {
      await onStartEpoch(ReportGenConfigMock.aggregatorAddress, 123, ReportGenConfigMock.leader);

      expect(mockBroadcastObserveReq).not.toHaveBeenCalled();
    });

    test('should silently ignore when leader is not the one in the config', async () => {
      await onStartEpoch(ReportGenConfigMock.aggregatorAddress, ReportGenConfigMock.epoch, 'NotTheLeader');

      expect(mockBroadcastObserveReq).not.toHaveBeenCalled();
    });
  });
});
