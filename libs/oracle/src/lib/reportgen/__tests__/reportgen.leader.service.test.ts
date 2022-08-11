import {
  ContractServiceMock,
  mockedOracleAddresses
} from '../../contract/__mocks__/contract.service.mock.js';
import { EventHubService, IEventHubEvents } from '../../event-hub/index.js';
import { TimerMock } from '../../pacemaker/__mocks__/timer.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import type { ReportGenLeaderService as ReportGenLeaderServiceType } from '../reportgen.leader.service.js';
import { mockBroadcastObserveReq, ReportGenNetworkServiceMock } from '../__mocks__/reportgen.service.mock.js';
import { ReportGenNetworkService } from '../reportgen.network.service.js';
import { ContractService } from '../../contract/index.js';
import { ReportGenConfigMock } from '../__mocks__/reportgen.config.mock.js';
import { expect, jest } from '@jest/globals';
import { IReportGenEvents, Phase } from '../reportgen.types.js';
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
        epoch: ReportGenConfigMock.epoch + 1, // Changed epoch here
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
        round: 2, // Changed epoch here
        signature: new Uint8Array([1, 2, 3]),
        epoch: ReportGenConfigMock.epoch,
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress
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
        round: 1, // Changed epoch here
        signature: new Uint8Array([1, 2, 3]),
        epoch: ReportGenConfigMock.epoch,
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress
      });

      // Send a second observation
      await onObserve(id, {
        observation: new BigNumber(456),
        round: 1, // Changed epoch here
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
  });
});
