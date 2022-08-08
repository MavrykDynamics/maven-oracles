import {
  ContractServiceMock,
  mockedAggregatorAddresses,
  mockedBlockchainConfig,
  mockedLastBlockchainReportEpoch,
  mockedOracleAddresses,
  mockGetLastBlockchainReport
} from '../../contract/__mocks__/contract.service.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import {
  mockBroadcastNewEpoch,
  PacemakerNetworkServiceMock
} from '../__mocks__/pacemaker.network.service.mock.js';
import { EventHubServiceMock } from '../../event-hub/__mocks__/event-hub.mock.js';
import {
  mockStartReportGen,
  ReportgenFactoryServiceMock
} from '../../reportgen/__mocks__/reportgen.factory.service.mock.js';
import { PacemakerConfigMock } from '../__mocks__/pacemaker.config.mock.js';
import { PacemakerNetworkService } from '../pacemaker.network.service.js';
import { EventHubService } from '../../event-hub/index.js';
import { ContractService } from '../../contract/index.js';
import { ReportGenFactoryService } from '../../reportgen/index.js';
import { IOracleInformations } from '@tezosdynamics/contracts';
import { beforeEach, jest } from '@jest/globals';
import { TimerMock } from '../__mocks__/timer.mock.js';

jest.unstable_mockModule('../timer.js', async () => ({
  Timer: TimerMock
}));

// Use async import to make sure we get the mocked one
const { PacemakerService } = await import('../pacemaker.service.js');

describe('PacemakerService', () => {
  let pacemakerService: PacemakerService;
  const pacemakerNetworkServiceMock = new PacemakerNetworkServiceMock();
  const eventHubServiceMock = new EventHubServiceMock();
  const contractServiceMock = new ContractServiceMock();
  const reportGenFactoryMock = new ReportgenFactoryServiceMock();

  beforeEach(async () => {
    mockGetLastBlockchainReport.mockReturnValue({
      epoch: mockedLastBlockchainReportEpoch
    });
    pacemakerService = new PacemakerService(
      OracleConfigMock,
      pacemakerNetworkServiceMock as unknown as PacemakerNetworkService,
      eventHubServiceMock as unknown as EventHubService,
      contractServiceMock as unknown as ContractService,
      reportGenFactoryMock as unknown as ReportGenFactoryService,
      PacemakerConfigMock
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    test('should initialize state correctly', async () => {
      await pacemakerService.initialize();

      expect(pacemakerService.getState()).toEqual({
        epoch: mockedLastBlockchainReportEpoch,
        leader: mockedOracleAddresses[0].oraclePeerId,
        newEpoch: mockedLastBlockchainReportEpoch,
        peersNewEpoch: new Map()
      });
    });

    const oracleAddresses: IOracleInformations[] = [
      {
        oracleAddress: 'oracle1/address',
        oraclePeerId: 'oracle1/peerId',
        oraclePublicKey: 'oracle1/publicKey'
      },
      {
        oracleAddress: 'oracle2/address',
        oraclePeerId: 'oracle2/peerId',
        oraclePublicKey: 'oracle2/publicKey'
      },
      {
        oracleAddress: 'oracle3/address',
        oraclePeerId: 'oracle3/peerId',
        oraclePublicKey: 'oracle3/publicKey'
      }
    ];

    test.each`
      epoch | leaderPeerId
      ${0}  | ${'oracle1/peerId'}
      ${1}  | ${'oracle2/peerId'}
      ${2}  | ${'oracle3/peerId'}
      ${3}  | ${'oracle1/peerId'}
    `('should initialize the leader correctly for epoch $epoch', async ({ epoch, leaderPeerId }) => {
      pacemakerService = new PacemakerService(
        OracleConfigMock,
        pacemakerNetworkServiceMock as unknown as PacemakerNetworkService,
        eventHubServiceMock as unknown as EventHubService,
        contractServiceMock as unknown as ContractService,
        reportGenFactoryMock as unknown as ReportGenFactoryService,
        {
          ...PacemakerConfigMock,
          oracleAddresses // Override oracle addresses
        }
      );

      mockGetLastBlockchainReport.mockReturnValue({
        epoch
      });

      await pacemakerService.initialize();

      expect(pacemakerService.getState()).toEqual({
        epoch: epoch,
        leader: leaderPeerId,
        newEpoch: epoch,
        peersNewEpoch: new Map()
      });
    });

    test('should start report generation algorithm', async () => {
      await pacemakerService.initialize();

      expect(mockStartReportGen).toHaveBeenCalledWith({
        epoch: mockedLastBlockchainReportEpoch,
        aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
        aggregatorPair: PacemakerConfigMock.aggregatorPair,
        alpha: mockedBlockchainConfig.alphaPercentPerThousand,
        heartbeatSeconds: mockedBlockchainConfig.heartBeatSeconds,
        leader: mockedOracleAddresses[0].oraclePeerId,
        oracleAddresses: mockedOracleAddresses
      });
    });

    test('should start timeout timer', async () => {
      await pacemakerService.initialize();

      // This does not test what timer have been started, it could be the resend timer.
      expect(pacemakerService._timerProgress.restart).toHaveBeenCalledTimes(1);
    });
  });

  describe('progress', () => {
    beforeEach(async () => {
      await pacemakerService.initialize();
      // Do not pollute tests with calls from initialize
      jest.clearAllMocks();
    });

    test('should have correct timeout value', async () => {
      expect(pacemakerService._timerProgress.timeMs).toEqual(
        PacemakerConfigMock.timerProgressDurationMiliseconds
      );
    });

    test('should restart timer after timeout', async () => {
      await pacemakerService._timerProgress.fakeTimeout();
      expect(pacemakerService._timerProgress.restart).toHaveBeenCalledTimes(1);
    });

    test('should broadcast epoch + 1 after timeout', async () => {
      await pacemakerService._timerProgress.fakeTimeout();
      expect(mockBroadcastNewEpoch).toHaveBeenCalledTimes(1);
      expect(mockBroadcastNewEpoch).toHaveBeenCalledWith({
        newEpoch: mockedLastBlockchainReportEpoch + 1,
        aggregatorAddress: PacemakerConfigMock.aggregatorAddress
      });
    });

    test('should store epoch + 1 as newEpoch after timeout', async () => {
      await pacemakerService._timerProgress.fakeTimeout();
      const { newEpoch } = pacemakerService.getState();
      expect(newEpoch).toEqual(mockedLastBlockchainReportEpoch + 1);
    });
  });
});
