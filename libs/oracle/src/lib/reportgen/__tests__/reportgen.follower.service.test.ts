import {
  ContractServiceMock,
  mockedOracleAddresses,
  mockVerifyReportSignature
} from '../../contract/__mocks__/contract.service.mock.js';
import { EventHubService } from '../../event-hub/index.js';
import { TimerMock } from '../../pacemaker/__mocks__/timer.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import type { ReportGenFollowerService as ReportGenFollowerServiceType } from '../reportgen.follower.service.js';
import { ReportGenNetworkServiceMock } from '../__mocks__/reportgen.network.service.mock.js';
import { ReportGenNetworkService } from '../reportgen.network.service.js';
import { ContractService } from '../../contract/index.js';
import { ReportGenConfigMock } from '../__mocks__/reportgen.config.mock.js';
import { beforeEach, jest } from '@jest/globals';
import { IReportGenEvents } from '../reportgen.types.js';
import { mockComputeMedian, mockSignData, mockVerifyData } from '../__mocks__/helpers.mock.js';

import { PriceService } from '../../price/index.js';
import { PriceServiceMock } from '../../price/__mocks__/price.service.mock.js';
import { PeerId } from '@libp2p/interface-peer-id';
import BigNumber from 'bignumber.js';

jest.unstable_mockModule('../../pacemaker/timer.js', async () => ({
  Timer: TimerMock
}));

jest.unstable_mockModule('../helpers.js', async () => ({
  verifyData: mockVerifyData,
  computeMedian: mockComputeMedian,
  signData: mockSignData
}));

// Use async import to make sure we get the mocked one
const { ReportGenFollowerService } = await import('../reportgen.follower.service.js');

describe('ReportGenFollowerService', () => {
  let reportGenFollowerService: ReportGenFollowerServiceType;

  let onObserveReqReceived: IReportGenEvents['observeReq'];
  let onReportReqReceived: IReportGenEvents['reportReq'];
  let onFinalReceived: IReportGenEvents['final'];
  let onFinalEchoReceived: IReportGenEvents['finalEcho'];

  const reportGenNetworkServiceMock = new ReportGenNetworkServiceMock();
  const eventHubServiceMock = new EventHubService();
  const priceServiceMock = new PriceServiceMock();
  const contractServiceMock: any = new ContractServiceMock();

  beforeEach(async () => {
    reportGenFollowerService = new ReportGenFollowerService(
      OracleConfigMock,
      reportGenNetworkServiceMock as unknown as ReportGenNetworkService,
      eventHubServiceMock as unknown as EventHubService,
      contractServiceMock as unknown as ContractService,
      priceServiceMock as unknown as PriceService,
      ReportGenConfigMock
    );

    // Dirty tricks to avoid errors due to properties/methods being private

    onObserveReqReceived =
      // @ts-expect-error
      reportGenFollowerService._onObserveReqReceivedHandler.bind(reportGenFollowerService);
    // @ts-expect-error
    onReportReqReceived = reportGenFollowerService._onReportReqReceivedHandler.bind(reportGenFollowerService);
    // @ts-expect-error
    onFinalReceived = reportGenFollowerService._onFinalReceivedHandler.bind(reportGenFollowerService);
    // @ts-expect-error
    onFinalEchoReceived = reportGenFollowerService._onFinalEchoReceivedHandler.bind(reportGenFollowerService);

    mockVerifyData.mockReturnValue(true);
    mockVerifyReportSignature.mockReturnValue(true);
  });

  afterEach(async () => {
    await reportGenFollowerService.stop();
    jest.clearAllMocks();
  });

  describe('on observe req', () => {
    const leader = {
      toString: () => mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePeerId,
      publicKey: mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePublicKey
    } as unknown as PeerId;

    test('should TODO', async () => {
      await onObserveReqReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        round: 1
      });
    });
  });

  describe('on report req', () => {
    const leader = {
      toString: () => mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePeerId,
      publicKey: mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePublicKey
    } as unknown as PeerId;

    beforeEach(async () => {
      // Trigger setting round to 1
      await onObserveReqReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        round: 1
      });
    });

    test('should TODO', async () => {
      await onReportReqReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        report: {
          epoch: ReportGenConfigMock.epoch,
          round: 1,
          observations: [
            {
              oracle: mockedOracleAddresses[0].oraclePeerId,
              signature: new Uint8Array([0]),
              price: new BigNumber(0)
            },
            {
              oracle: mockedOracleAddresses[1].oraclePeerId,
              signature: new Uint8Array([1]),
              price: new BigNumber(1)
            },
            {
              oracle: mockedOracleAddresses[2].oraclePeerId,
              signature: new Uint8Array([2]),
              price: new BigNumber(2)
            },
            {
              oracle: mockedOracleAddresses[3].oraclePeerId,
              signature: new Uint8Array([3]),
              price: new BigNumber(3)
            },
            {
              oracle: mockedOracleAddresses[3].oraclePeerId,
              signature: new Uint8Array([3]),
              price: new BigNumber(3)
            },
            {
              oracle: mockedOracleAddresses[4].oraclePeerId,
              signature: new Uint8Array([4]),
              price: new BigNumber(4)
            }
          ]
        }
      });
    });
  });

  describe('on final', () => {
    const leader = {
      toString: () => mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePeerId,
      publicKey: mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePublicKey
    } as unknown as PeerId;

    test('should TODO', async () => {
      await onFinalReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        attestedReport: {
          epoch: ReportGenConfigMock.epoch,
          round: 0,
          signatures: [],
          observations: []
        }
      });
    });
  });

  describe('on final echo', () => {
    const leader = {
      toString: () => mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePeerId,
      publicKey: mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePublicKey
    } as unknown as PeerId;

    test('should TODO', async () => {
      await onFinalEchoReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        attestedReport: {
          epoch: ReportGenConfigMock.epoch,
          round: 0,
          signatures: [],
          observations: []
        }
      });
    });
  });
});
