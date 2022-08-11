import {
  ContractServiceMock,
  mockedOracleAddresses,
  mockVerifyReportSignature
} from '../../contract/__mocks__/contract.service.mock.js';
import { EventHubService, IEventHubEvents } from '../../event-hub/index.js';
import { TimerMock } from '../../pacemaker/__mocks__/timer.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import type { ReportGenLeaderService as ReportGenLeaderServiceType } from '../reportgen.leader.service.js';
import {
  mockBroadcastObserveReq,
  mockBroadcastReportReq,
  ReportGenNetworkServiceMock
} from '../__mocks__/reportgen.network.service.mock.js';
import { ReportGenNetworkService } from '../reportgen.network.service.js';
import { ContractService } from '../../contract/index.js';
import { ReportGenConfigMock } from '../__mocks__/reportgen.config.mock.js';
import { expect, jest } from '@jest/globals';
import { IReportGenEvents, IReportMessage, Phase } from '../reportgen.types.js';
import { PeerId } from '@libp2p/interface-peer-id';
import BigNumber from 'bignumber.js';
import { mockVerifyData } from '../__mocks__/helpers.mock.js';

jest.unstable_mockModule('../../pacemaker/timer.js', async () => ({
  Timer: TimerMock
}));

jest.unstable_mockModule('../helpers.js', async () => ({
  verifyData: mockVerifyData
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

    mockVerifyData.mockReturnValue(true);
    mockVerifyReportSignature.mockReturnValue(true);
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

  describe('on round timer timout', () => {
    beforeEach(async () => {
      await onStartEpoch(
        ReportGenConfigMock.aggregatorAddress,
        ReportGenConfigMock.epoch,
        ReportGenConfigMock.leader
      );
      jest.clearAllMocks();
    });

    test('should restart round timer', async () => {
      await timerRound.fakeTimeout();
      expect(timerRound.restart).toHaveBeenCalledTimes(1);
    });

    test('should increment round', async () => {
      await timerRound.fakeTimeout();
      const { round } = reportGenLeaderService.getState();
      expect(round).toEqual(2);
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
        round: 2
      });
    });
  });

  describe('on observe', () => {
    beforeEach(async () => {
      await onStartEpoch(
        ReportGenConfigMock.aggregatorAddress,
        ReportGenConfigMock.epoch,
        ReportGenConfigMock.leader
      );
      jest.clearAllMocks();
    });

    test.each`
      observation | peerId                                   | pubKey
      ${5}        | ${mockedOracleAddresses[0].oraclePeerId} | ${mockedOracleAddresses[0].oraclePublicKey}
      ${6}        | ${mockedOracleAddresses[1].oraclePeerId} | ${mockedOracleAddresses[1].oraclePublicKey}
      ${7}        | ${mockedOracleAddresses[2].oraclePeerId} | ${mockedOracleAddresses[2].oraclePublicKey}
      ${8}        | ${mockedOracleAddresses[3].oraclePeerId} | ${mockedOracleAddresses[3].oraclePublicKey}
    `('should store observation for $peerId', async ({ observation, peerId, pubKey }) => {
      const id = {
        toString: () => peerId,
        publicKey: pubKey
      } as unknown as PeerId;

      await onObserve(id, {
        observation: new BigNumber(observation),
        round: 1,
        signature: new Uint8Array([1, 2, 3]),
        epoch: ReportGenConfigMock.epoch,
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress
      });

      const { observe } = reportGenLeaderService.getState();

      expect(observe).toEqual(
        new Map([
          [
            peerId,
            {
              observation: new BigNumber(observation),
              signature: new Uint8Array([1, 2, 3])
            }
          ]
        ])
      );
    });

    test('should not store observation if signature verification fails', async () => {
      const id = {
        toString: () => mockedOracleAddresses[0].oraclePeerId,
        publicKey: mockedOracleAddresses[0].oraclePublicKey
      } as unknown as PeerId;

      mockVerifyData.mockReturnValue(false);

      await onObserve(id, {
        observation: new BigNumber(123),
        round: 1,
        signature: new Uint8Array([1, 2, 3]),
        epoch: ReportGenConfigMock.epoch,
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress
      });

      const { observe } = reportGenLeaderService.getState();

      expect(observe).toEqual(new Map());
    });

    test('should not store observation if epochs do not match', async () => {
      const id = {
        toString: () => mockedOracleAddresses[0].oraclePeerId,
        publicKey: mockedOracleAddresses[0].oraclePublicKey
      } as unknown as PeerId;

      await onObserve(id, {
        observation: new BigNumber(123),
        round: 1,
        signature: new Uint8Array([1, 2, 3]),
        epoch: ReportGenConfigMock.epoch + 1, // Mismatched epoch here
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress
      });

      const { observe } = reportGenLeaderService.getState();

      expect(observe).toEqual(new Map());
    });

    test('should not store observation if rounds do not match', async () => {
      const id = {
        toString: () => mockedOracleAddresses[0].oraclePeerId,
        publicKey: mockedOracleAddresses[0].oraclePublicKey
      } as unknown as PeerId;

      await onObserve(id, {
        observation: new BigNumber(123),
        round: 2, // Mismatched round here
        signature: new Uint8Array([1, 2, 3]),
        epoch: ReportGenConfigMock.epoch,
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress
      });

      const { observe } = reportGenLeaderService.getState();

      expect(observe).toEqual(new Map());
    });

    test('should not store observation if aggregatorAddress do not match', async () => {
      const id = {
        toString: () => mockedOracleAddresses[0].oraclePeerId,
        publicKey: mockedOracleAddresses[0].oraclePublicKey
      } as unknown as PeerId;

      await onObserve(id, {
        observation: new BigNumber(123),
        round: 1,
        signature: new Uint8Array([1, 2, 3]),
        epoch: ReportGenConfigMock.epoch,
        aggregatorAddress: 'NotTheAggregatorAddress' // Mismatched address here
      });

      const { observe } = reportGenLeaderService.getState();

      expect(observe).toEqual(new Map());
    });

    test('should not store observation if already received observation', async () => {
      const id = {
        toString: () => mockedOracleAddresses[0].oraclePeerId,
        publicKey: mockedOracleAddresses[0].oraclePublicKey
      } as unknown as PeerId;

      await onObserve(id, {
        observation: new BigNumber(123),
        round: 1,
        signature: new Uint8Array([1, 2, 3]),
        epoch: ReportGenConfigMock.epoch,
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress
      });

      // Send a second observation
      await onObserve(id, {
        observation: new BigNumber(456),
        round: 1,
        signature: new Uint8Array([4, 5, 6]),
        epoch: ReportGenConfigMock.epoch,
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress
      });

      const { observe } = reportGenLeaderService.getState();

      // Check that only the first observation is kept
      expect(observe).toEqual(
        new Map([
          [
            mockedOracleAddresses[0].oraclePeerId,
            {
              observation: new BigNumber(123),
              signature: new Uint8Array([1, 2, 3])
            }
          ]
        ])
      );
    });

    test('should start grace timer if not enough observation are received', async () => {
      // Since there is 7 mocked oracles, f is 2.
      // So, grace timer should start when 5 values are received (2*f+1)

      const values = [3, 3, 3, 3]; // 4 observations should not trigger grace period

      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId,
            publicKey: addrs.oraclePublicKey
          } as unknown as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onObserve(ids[i], {
            observation: new BigNumber(value),
            round: 1,
            signature: new Uint8Array([i]),
            epoch: ReportGenConfigMock.epoch,
            aggregatorAddress: ReportGenConfigMock.aggregatorAddress
          })
        )
      );

      const { phase } = reportGenLeaderService.getState();

      expect(phase).toEqual(Phase.Observe);
      expect(timerGrace.restart).not.toHaveBeenCalled();
    });

    test('should start grace timer if enough observation are received', async () => {
      // Since there is 7 mocked oracles, f is 2.
      // So, grace timer should start when 5 values are received (2*f+1)

      const values = [3, 3, 3, 3, 3]; // 5 observations should trigger grace period

      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId,
            publicKey: addrs.oraclePublicKey
          } as unknown as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onObserve(ids[i], {
            observation: new BigNumber(value),
            round: 1,
            signature: new Uint8Array([i]),
            epoch: ReportGenConfigMock.epoch,
            aggregatorAddress: ReportGenConfigMock.aggregatorAddress
          })
        )
      );

      const { phase } = reportGenLeaderService.getState();

      expect(timerGrace.restart).toHaveBeenCalledTimes(1);
      expect(phase).toEqual(Phase.Grace);
    });
  });

  describe('during grace period', () => {
    const ids = mockedOracleAddresses.map(
      (addrs) =>
        ({
          toString: () => addrs.oraclePeerId,
          publicKey: addrs.oraclePublicKey
        } as unknown as PeerId)
    );
    // Since there is 7 mocked oracles, f is 2.
    // So, grace timer should start when 5 values are received (2*f+1)

    const values = [3, 3, 3, 3, 3]; // 5 observations should trigger grace period

    beforeEach(async () => {
      await onStartEpoch(
        ReportGenConfigMock.aggregatorAddress,
        ReportGenConfigMock.epoch,
        ReportGenConfigMock.leader
      );

      // Send 2*f + 1 observations
      await Promise.all(
        values.map((value, i) =>
          onObserve(ids[i], {
            observation: new BigNumber(value),
            round: 1,
            signature: new Uint8Array([i]),
            epoch: ReportGenConfigMock.epoch,
            aggregatorAddress: ReportGenConfigMock.aggregatorAddress
          })
        )
      );

      // Make sure we are in the grace period
      const { phase } = reportGenLeaderService.getState();
      expect(phase).toEqual(Phase.Grace);

      jest.clearAllMocks();
    });

    test('should still accept observations', async () => {
      // Use address #5 since #0...#4 have already sent observations
      const id = {
        toString: () => mockedOracleAddresses[5].oraclePeerId,
        publicKey: mockedOracleAddresses[5].oraclePublicKey
      } as unknown as PeerId;

      await onObserve(id, {
        observation: new BigNumber(456),
        round: 1,
        signature: new Uint8Array([4, 5, 6]),
        epoch: ReportGenConfigMock.epoch,
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress
      });

      const { observe } = reportGenLeaderService.getState();
      expect(observe.size).toEqual(values.length + 1);
    });

    test('should end grace period on timer timeout', async () => {
      await timerGrace.fakeTimeout();

      const { phase } = reportGenLeaderService.getState();
      expect(phase).toEqual(Phase.Report);
    });
  });

  describe('during report period', () => {
    const ids = mockedOracleAddresses.map(
      (addrs) =>
        ({
          toString: () => addrs.oraclePeerId,
          publicKey: addrs.oraclePublicKey
        } as unknown as PeerId)
    );
    // Since there is 7 mocked oracles, f is 2.
    // So, grace timer should start when 5 values are received (2*f+1)

    const values = [3, 3, 3, 3, 3]; // 5 observations should trigger grace period

    const reportMessageSender = {
      toString: () => mockedOracleAddresses[0].oraclePeerId,
      publicKey: mockedOracleAddresses[0].oraclePublicKey
    } as unknown as PeerId;

    let reportMessage: IReportMessage;

    beforeEach(async () => {
      reportMessage = {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        signature: {
          oracle: mockedOracleAddresses[0].oraclePeerId,
          signature: `sig${mockedOracleAddresses[0].oraclePeerId}`
        },
        compressedReport: {
          epoch: ReportGenConfigMock.epoch,
          observations: [],
          round: 1
        }
      };
      await onStartEpoch(
        ReportGenConfigMock.aggregatorAddress,
        ReportGenConfigMock.epoch,
        ReportGenConfigMock.leader
      );

      // Send 2*f + 1 observations
      await Promise.all(
        values.map((value, i) =>
          onObserve(ids[i], {
            observation: new BigNumber(value),
            round: 1,
            signature: new Uint8Array([i]),
            epoch: ReportGenConfigMock.epoch,
            aggregatorAddress: ReportGenConfigMock.aggregatorAddress
          })
        )
      );

      // Make sure we are in the grace period
      const { phase } = reportGenLeaderService.getState();
      expect(phase).toEqual(Phase.Grace);

      // Clear mocks before ending grace period to test calls happening at grace period timeout
      jest.clearAllMocks();

      // End grace period
      await timerGrace.fakeTimeout();
    });

    test('should not accept observations', async () => {
      // Use address #5 since #0...#4 have already sent observations
      const id = {
        toString: () => mockedOracleAddresses[5].oraclePeerId,
        publicKey: mockedOracleAddresses[5].oraclePublicKey
      } as unknown as PeerId;

      await onObserve(id, {
        observation: new BigNumber(456),
        round: 1,
        signature: new Uint8Array([4, 5, 6]),
        epoch: ReportGenConfigMock.epoch,
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress
      });

      // Observation count should remain unchanged
      const { observe } = reportGenLeaderService.getState();
      expect(observe.size).toEqual(values.length);
    });

    test('should broadcast assembled report', async () => {
      expect(mockBroadcastReportReq).toHaveBeenCalledTimes(1);
      expect(mockBroadcastReportReq).toHaveBeenCalledWith({
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        report: {
          epoch: ReportGenConfigMock.epoch,
          round: 1,
          observations: [
            {
              oracle: 'oracle1/peerId',
              price: new BigNumber(values[0]),
              signature: new Uint8Array([0])
            },
            {
              oracle: 'oracle2/peerId',
              price: new BigNumber(values[1]),
              signature: new Uint8Array([1])
            },
            {
              oracle: 'oracle3/peerId',
              price: new BigNumber(values[3]),
              signature: new Uint8Array([2])
            },
            {
              oracle: 'oracle4/peerId',
              price: new BigNumber(values[3]),
              signature: new Uint8Array([3])
            },
            {
              oracle: 'oracle5/peerId',
              price: new BigNumber(values[4]),
              signature: new Uint8Array([4])
            }
          ]
        }
      });
    });

    test('should store received report', async () => {
      await onReport(reportMessageSender, reportMessage);

      const { reports } = reportGenLeaderService.getState();

      expect(reports).toEqual(
        new Map([
          [
            reportMessageSender.toString(),
            {
              report: reportMessage.compressedReport,
              signature: reportMessage.signature
            }
          ]
        ])
      );
    });

    test('should not store received report if epoch do not match', async () => {
      reportMessage.compressedReport.epoch += 1; // Mismatched epoch

      await onReport(reportMessageSender, reportMessage);

      const { reports } = reportGenLeaderService.getState();

      expect(reports.size).toEqual(0);
    });

    test('should not store received report if round do not match', async () => {
      reportMessage.compressedReport.round += 1; // Mismatched round

      await onReport(reportMessageSender, reportMessage);

      const { reports } = reportGenLeaderService.getState();

      expect(reports.size).toEqual(0);
    });

    test('should not store received report if report signature check fails', async () => {
      mockVerifyReportSignature.mockReturnValue(false);

      await onReport(reportMessageSender, reportMessage);

      const { reports } = reportGenLeaderService.getState();

      expect(reports.size).toEqual(0);
    });

    test.each`
      nReports | expectedPhase
      ${1}     | ${Phase.Report}
      ${2}     | ${Phase.Report}
      ${3}     | ${Phase.Final}
      ${4}     | ${Phase.Final}
    `('should be in $expectedPhase after receiving $nReports', async ({ nReports, expectedPhase }) => {
      // Since there is 7 mocked oracles, f is 2.
      // So, final phase should start after 3 (f + 1) received reports

      const range = Array(nReports)
        .fill(1)
        .map((x, y) => x + y); // generate array of nReport element to iterate over

      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        range.map((id, i) =>
          onReport(ids[i], {
            ...reportMessage,
            signature: {
              oracle: ids[i].toString(),
              signature: `sig${ids[i].toString()}`
            }
          })
        )
      );

      const { phase } = reportGenLeaderService.getState();

      expect(phase).toEqual(expectedPhase);
    });
  });
});
