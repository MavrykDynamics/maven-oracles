import {
  ContractServiceMock,
  mockedAggregatorAddresses,
  mockedBlockchainConfig,
  mockedLastBlockchainReportEpoch,
  mockedOracleAddresses,
  mockGetLastBlockchainReport,
  mockGetOraclesAddresses
} from '../../contract/__mocks__/contract.service.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import { PacemakerService } from '../pacemaker.service.js';
import { PacemakerNetworkServiceMock } from '../__mocks__/pacemaker.network.service.mock.js';
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

describe('PacemakerService', () => {
  let pacemakerService: PacemakerService;
  const pacemakerNetworkServiceMock = new PacemakerNetworkServiceMock();
  const eventHubServiceMock = new EventHubServiceMock();
  const contractServiceMock = new ContractServiceMock();
  const reportGenFactoryMock = new ReportgenFactoryServiceMock();

  beforeEach(async () => {
    mockGetOraclesAddresses.mockReturnValue(mockedOracleAddresses);
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
      mockGetOraclesAddresses.mockReturnValue(oracleAddresses);
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

        aggregatorAddress: 'aggregatorAddressMock',
        aggregatorPair: 'aggregatorAddressMock',
        alpha: mockedBlockchainConfig.alphaPercentPerThousand,
        heartbeatSeconds: mockedBlockchainConfig.heartBeatSeconds,
        leader: 'oracle1/peerId',
        oracleAddresses: undefined
      });
    });
  });
});
