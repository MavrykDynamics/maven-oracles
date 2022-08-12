import {
  ContractServiceMock,
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
import { jest } from '@jest/globals';
import { IReportGenEvents } from '../reportgen.types.js';
import { mockComputeMedian, mockSignData, mockVerifyData } from '../__mocks__/helpers.mock.js';

import { PriceService } from '../../price/index.js';
import { PriceServiceMock } from '../../price/__mocks__/price.service.mock.js';

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

  describe('test', () => {
    test('test', async () => {});
  });
});
