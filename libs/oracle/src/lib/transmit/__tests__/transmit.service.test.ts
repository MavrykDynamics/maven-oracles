import {
  ContractServiceMock,
  mockedAggregatorAddresses,
  mockedOracleAddresses
} from '../../contract/__mocks__/contract.service.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import { EventHubService } from '../../event-hub/index.js';
import { ContractService } from '../../contract/index.js';
import { beforeEach, expect, jest } from '@jest/globals';
import type { TransmitService as TransmitServiceType } from '../transmit.service.js';
import { mockedEmptyAttestedRepport } from '../__mocks__/transmit.service.mock.js';
import { mockComputeMedian, mockSignData, mockVerifyData } from '../../reportgen/__mocks__/helpers.mock';
import BigNumber from 'bignumber.js';
import { mockRandomPermutation } from '../__mocks__/helpers.mock.js';
import { TimerMock } from '../../pacemaker/__mocks__/timer.mock.js';
import { ReportGenConfigMock } from '../../reportgen/__mocks__/reportgen.config.mock.js';

jest.unstable_mockModule('../../pacemaker/timer.js', async () => ({
  Timer: TimerMock
}));

jest.unstable_mockModule('../../reportgen/helpers.js', async () => ({
  verifyData: mockVerifyData,
  computeMedian: mockComputeMedian,
  signData: mockSignData
}));

jest.unstable_mockModule('../helpers.js', async () => ({
  randomPermutation: mockRandomPermutation
}));

// Use async import to make sure we get the mocked one
const { TransmitService } = await import('../transmit.service.js');

describe('TransmitService', () => {
  let transmitService: TransmitServiceType;
  let eventHubServiceMock = new EventHubService();
  let timerTransmit: any;
  let lastTransmittedReport: any;
  let reports: any;

  const contractServiceMock = new ContractServiceMock();

  beforeEach(async () => {
    transmitService = new TransmitService(
      OracleConfigMock,
      eventHubServiceMock as unknown as EventHubService,
      contractServiceMock as unknown as ContractService
    );

    // @ts-expect-error
    timerTransmit = transmitService._timerTransmit;

    // @ts-expect-error
    lastTransmittedReport = transmitService._lastTransmittedReport;

    // @ts-expect-error
    reports = transmitService._reports;
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    test('onModuleInit', async () => {
      const initializeMock: any = jest.fn();
      transmitService.initialize = initializeMock;
      await transmitService.onModuleInit();
      expect(initializeMock).toHaveBeenCalledTimes(1);
    });

    test('should initialize correctly', async () => {
      const listenerMock: any = jest.fn();
      eventHubServiceMock.addListener = listenerMock;
      await transmitService.initialize();
      expect(listenerMock).toHaveBeenNthCalledWith(1, 'transmit', expect.any(Function));
      eventHubServiceMock = new EventHubService();
    });

    test('transmit listener should be call on initialize', async () => {
      const onTransmitMock: any = jest.fn();
      transmitService.onTransmit = onTransmitMock;

      await transmitService.initialize();
      eventHubServiceMock.transmit(
        mockedAggregatorAddresses[0].aggregatorAddress,
        mockedOracleAddresses,
        mockedEmptyAttestedRepport,
        ReportGenConfigMock.alphaPerThousand
      );

      expect(onTransmitMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('onTransmit', () => {
    beforeEach(async () => {
      await transmitService.initialize();
      jest.clearAllMocks();
      lastTransmittedReport.set(mockedAggregatorAddresses[0].aggregatorAddress, undefined); // reset lastTransmittedReport
    });

    test('onTransmit should go to doTransmit because: lastTransmittedReport === undefined', async () => {
      await transmitService.onTransmit(
        mockedAggregatorAddresses[0].aggregatorAddress,
        mockedOracleAddresses,
        mockedEmptyAttestedRepport,
        ReportGenConfigMock.alphaPerThousand
      );
      await timerTransmit.fakeTimeout();
      expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(
        2,
        mockedAggregatorAddresses[0].aggregatorAddress
      );
      expect((contractServiceMock as any).sendReportBlockchain).toHaveBeenCalledTimes(1);
      expect(timerTransmit.restart).toHaveBeenCalledTimes(1);
    });

    test('onTransmit should go to doTransmit because last transmitted report is older than the blockchain report', async () => {
      // We need to set up reports so that
      // (Oe, Or) > (Ce, Cr)
      // (Oe, Or) > (Le, Lr)
      // (Le, Lr) ≤ (Ce, Cr)

      // (Oe, Or) = (3, 0) -> report that we are sending in onTransmit
      // (Le, Lr) = (2, 2) -> last transmitted report (set up below)
      // (Ce, Cr) = (2, 2) -> returned by contract service mock

      lastTransmittedReport.set(mockedAggregatorAddresses[0].aggregatorAddress, {
        epoch: 2, // Le
        round: 2, // Lr
        report: mockedEmptyAttestedRepport
      });
      await transmitService.onTransmit(
        mockedAggregatorAddresses[0].aggregatorAddress,
        mockedOracleAddresses,
        mockedEmptyAttestedRepport,
        ReportGenConfigMock.alphaPerThousand
      );
      await timerTransmit.fakeTimeout();
      expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(
        2,
        mockedAggregatorAddresses[0].aggregatorAddress
      );
      expect((contractServiceMock as any).sendReportBlockchain).toHaveBeenCalledTimes(1);
      expect(timerTransmit.restart).toHaveBeenCalledTimes(1);
    });

    test('onTransmit should go to doTransmit because: Deviation is over threshold', async () => {
      mockComputeMedian.mockReturnValueOnce(new BigNumber(50));
      lastTransmittedReport.set(mockedAggregatorAddresses[0].aggregatorAddress, {
        epoch: 2,
        round: 2,
        report: mockedEmptyAttestedRepport
      });
      await transmitService.onTransmit(
        mockedAggregatorAddresses[0].aggregatorAddress,
        mockedOracleAddresses,
        mockedEmptyAttestedRepport,
        ReportGenConfigMock.alphaPerThousand
      );
      await timerTransmit.fakeTimeout();
      expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(
        2,
        mockedAggregatorAddresses[0].aggregatorAddress
      );
      expect((contractServiceMock as any).sendReportBlockchain).toHaveBeenCalledTimes(1);
      expect(timerTransmit.restart).toHaveBeenCalledTimes(1);
    });

    test('onTransmit should go to doTransmit because: on _onTransmitTimerTimeout, this._reports.pop() === undefined', async () => {
      mockComputeMedian.mockReturnValueOnce(new BigNumber(50));
      lastTransmittedReport.set(mockedAggregatorAddresses[0].aggregatorAddress, {
        epoch: 2,
        round: 2,
        report: mockedEmptyAttestedRepport
      });
      await transmitService.onTransmit(
        mockedAggregatorAddresses[0].aggregatorAddress,
        mockedOracleAddresses,
        mockedEmptyAttestedRepport,
        ReportGenConfigMock.alphaPerThousand
      );
      reports.clear();
      await timerTransmit.fakeTimeout();
      expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(
        1,
        mockedAggregatorAddresses[0].aggregatorAddress
      );
      expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
      expect(timerTransmit.restart).toHaveBeenCalledTimes(1);
    });

    test('onTransmit should go to doTransmit because: NOT TRANSMITTING', async () => {
      mockComputeMedian.mockReturnValueOnce(new BigNumber(50));
      lastTransmittedReport.set(mockedAggregatorAddresses[0].aggregatorAddress, {
        epoch: 2,
        round: 2,
        report: mockedEmptyAttestedRepport
      });
      await transmitService.onTransmit(
        mockedAggregatorAddresses[0].aggregatorAddress,
        mockedOracleAddresses,
        mockedEmptyAttestedRepport,
        ReportGenConfigMock.alphaPerThousand
      );
      reports.clear();
      reports.push({
        time: Date.now(),
        report: {
          epoch: 2,
          round: 0,
          observations: [],
          signatures: []
        },
        aggregatorAddress: mockedAggregatorAddresses[0].aggregatorAddress,
        oracleAddresses: mockedOracleAddresses
      });
      reports.push({
        time: Date.now(),
        report: {
          epoch: 2,
          round: 0,
          observations: [],
          signatures: []
        },
        aggregatorAddress: mockedAggregatorAddresses[0].aggregatorAddress,
        oracleAddresses: mockedOracleAddresses
      });
      await timerTransmit.fakeTimeout();
      expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(
        2,
        mockedAggregatorAddresses[0].aggregatorAddress
      );
      expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
      expect(timerTransmit.restart).toHaveBeenCalledTimes(2);
    });

    test('onTransmit should go to doTransmit because: on _onTransmitTimerTimeout, this._reports.pop() === undefined', async () => {
      mockComputeMedian.mockReturnValueOnce(new BigNumber(50));
      lastTransmittedReport.set(mockedAggregatorAddresses[0].aggregatorAddress, {
        epoch: 2,
        round: 2,
        report: mockedEmptyAttestedRepport
      });
      await transmitService.onTransmit(
        mockedAggregatorAddresses[0].aggregatorAddress,
        mockedOracleAddresses,
        mockedEmptyAttestedRepport,
        ReportGenConfigMock.alphaPerThousand
      );
      reports.clear();
      await timerTransmit.fakeTimeout();
      expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(
        1,
        mockedAggregatorAddresses[0].aggregatorAddress
      );
      expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
      expect(timerTransmit.restart).toHaveBeenCalledTimes(1);
    });

    test('onTransmit should not succeed because lastBlockchainReport is not null and last report on blockchain is more recent than epoch/round', async () => {
      await transmitService.onTransmit(
        mockedAggregatorAddresses[0].aggregatorAddress,
        mockedOracleAddresses,
        {
          epoch: 0, // 0 < 2
          round: 0,
          observations: [],
          signatures: []
        },
        ReportGenConfigMock.alphaPerThousand
      );
      expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(
        1,
        mockedAggregatorAddresses[0].aggregatorAddress
      );
      expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
      expect(timerTransmit.restart).not.toHaveBeenCalled();
    });

    test('onTransmit should not succeed because lastBlockchainReport is null and last report on blockchain is more recent than epoch/round', async () => {
      (contractServiceMock as any).getLastBlockchainReport.mockResolvedValue(null);
      lastTransmittedReport.set(mockedAggregatorAddresses[0].aggregatorAddress, {
        epoch: 2,
        round: 2,
        report: mockedEmptyAttestedRepport
      });
      await transmitService.onTransmit(
        mockedAggregatorAddresses[0].aggregatorAddress,
        mockedOracleAddresses,
        {
          epoch: 0, // 0 < 2
          round: 0,
          observations: [],
          signatures: []
        },
        ReportGenConfigMock.alphaPerThousand
      );
      expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(
        1,
        mockedAggregatorAddresses[0].aggregatorAddress
      );
      expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
      expect(timerTransmit.restart).not.toHaveBeenCalled();
    });

    test('onTransmit should not succeed because lastBlockchainReport is null and last report on blockchain is more recent than epoch/round', async () => {
      (contractServiceMock as any).getLastBlockchainReport.mockResolvedValue(null);
      lastTransmittedReport.set(mockedAggregatorAddresses[0].aggregatorAddress, {
        epoch: 3,
        round: 3,
        report: mockedEmptyAttestedRepport
      });
      await transmitService.onTransmit(
        mockedAggregatorAddresses[0].aggregatorAddress,
        mockedOracleAddresses,
        {
          epoch: 3, // 3 == 3
          round: 0, // 0 < 3
          observations: [],
          signatures: []
        },
        ReportGenConfigMock.alphaPerThousand
      );
      expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(
        1,
        mockedAggregatorAddresses[0].aggregatorAddress
      );
      expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
      expect(timerTransmit.restart).not.toHaveBeenCalled();
    });
  });
});
