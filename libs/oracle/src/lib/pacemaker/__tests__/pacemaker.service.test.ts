import {
  ContractServiceMock,
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
import {
  mockStartReportGen,
  mockStopReportGen,
  ReportgenFactoryServiceMock
} from '../../reportgen/__mocks__/reportgen.factory.service.mock.js';
import { PacemakerConfigMock } from '../__mocks__/pacemaker.config.mock.js';
import { PacemakerNetworkService } from '../pacemaker.network.service.js';
import { EventHubService } from '../../event-hub/index.js';
import { ContractService } from '../../contract/index.js';
import { ReportGenFactoryService } from '../../reportgen/index.js';
import { IOracleInformations } from '@tezosdynamics/contracts';
import { beforeEach, expect, jest } from '@jest/globals';
import { TimerMock } from '../__mocks__/timer.mock.js';
import { PeerId } from '@libp2p/interface-peer-id';
import type { PacemakerService as PacemakerServiceType } from '../pacemaker.service.js';
import { INewEpochMessage } from '../pacemaker.types.js';

jest.unstable_mockModule('../timer.js', async () => ({
  Timer: TimerMock
}));

// Use async import to make sure we get the mocked one
const { PacemakerService } = await import('../pacemaker.service.js');

describe('PacemakerService', () => {
  let pacemakerService: PacemakerServiceType;
  let timerProgress: any;
  let timerResend: any;
  let onNewEpochReceived: (from: PeerId, newEpochMessage: INewEpochMessage) => Promise<void>;
  const pacemakerNetworkServiceMock = new PacemakerNetworkServiceMock();
  const eventHubServiceMock = new EventHubService();
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

    // Dirty tricks to avoid errors due to properties/methods being private

    // @ts-expect-error
    timerProgress = pacemakerService._timerProgress;
    // @ts-expect-error
    timerResend = pacemakerService._timerResend;

    // @ts-expect-error
    onNewEpochReceived = pacemakerService._onNewEpochReceived.bind(pacemakerService);
  });

  afterEach(async () => {
    await pacemakerService.stop();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    test('should initialize state correctly', async () => {
      await pacemakerService.initialize();

      expect(pacemakerService.getState()).toEqual({
        epoch: mockedLastBlockchainReportEpoch,
        leader: mockedOracleAddresses[2].oraclePeerId, // Mocked epoch is 2
        newEpoch: mockedLastBlockchainReportEpoch,
        peersNewEpoch: new Map()
      });
    });

    // Take only the first 3 addresses so we can test that it cycle
    const oracleAddresses: IOracleInformations[] = mockedOracleAddresses.slice(0, 3);

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
        leader: mockedOracleAddresses[2].oraclePeerId, // Mocked epoch is 2
        oracleAddresses: mockedOracleAddresses
      });
    });

    test('should start timeout timer', async () => {
      await pacemakerService.initialize();

      // This does not test what timer have been started, it could be the resend timer.
      expect(timerProgress.restart).toHaveBeenCalledTimes(1);
    });
  });

  describe('progress', () => {
    beforeEach(async () => {
      await pacemakerService.initialize();
      // Do not pollute tests with calls from initialize
      jest.clearAllMocks();
    });

    test('should have correct timeout value', async () => {
      expect(timerProgress.timeMs).toEqual(PacemakerConfigMock.timerProgressDurationMiliseconds);
    });

    test('should restart timer after timeout', async () => {
      await timerProgress.fakeTimeout();
      expect(timerProgress.restart).toHaveBeenCalledTimes(1);
    });

    test('should broadcast epoch + 1 after timeout', async () => {
      await timerProgress.fakeTimeout();
      expect(mockBroadcastNewEpoch).toHaveBeenCalledTimes(1);
      expect(mockBroadcastNewEpoch).toHaveBeenCalledWith({
        newEpoch: mockedLastBlockchainReportEpoch + 1,
        aggregatorAddress: PacemakerConfigMock.aggregatorAddress
      });
    });

    test('should store epoch + 1 as newEpoch after timeout', async () => {
      await timerProgress.fakeTimeout();
      const { newEpoch } = pacemakerService.getState();
      expect(newEpoch).toEqual(mockedLastBlockchainReportEpoch + 1);
    });

    test('should reset timer on progress event', async () => {
      eventHubServiceMock.progress(PacemakerConfigMock.aggregatorAddress);
      expect(timerProgress.restart).toHaveBeenCalledTimes(1);
    });

    test('should not reset timer on progress event for another aggregator', async () => {
      eventHubServiceMock.progress('another aggregator');
      expect(timerProgress.restart).not.toHaveBeenCalled();
    });

    test('should reset timer on changeLeader event', async () => {
      eventHubServiceMock.changeLeader(PacemakerConfigMock.aggregatorAddress);
      expect(timerProgress.restart).toHaveBeenCalledTimes(1);
    });

    test('should not reset timer on changeLeader event for another aggregator', async () => {
      eventHubServiceMock.changeLeader('another aggregator');
      expect(timerProgress.restart).not.toHaveBeenCalled();
    });
  });

  describe('resend', () => {
    beforeEach(async () => {
      await pacemakerService.initialize();
      // Do not pollute tests with calls from initialize
      jest.clearAllMocks();
    });

    test('should have correct timeout value', async () => {
      expect(timerResend.timeMs).toEqual(PacemakerConfigMock.timerResendDurationMiliseconds);
    });

    test('should restart timer after timeout', async () => {
      await timerResend.fakeTimeout();
      expect(timerResend.restart).toHaveBeenCalledTimes(1);
    });

    test('should broadcast epoch after timeout', async () => {
      await timerResend.fakeTimeout();
      expect(mockBroadcastNewEpoch).toHaveBeenCalledTimes(1);
      expect(mockBroadcastNewEpoch).toHaveBeenCalledWith({
        newEpoch: mockedLastBlockchainReportEpoch,
        aggregatorAddress: PacemakerConfigMock.aggregatorAddress
      });
    });
  });

  describe('on newEpoch received', () => {
    beforeEach(async () => {
      await pacemakerService.initialize();
      // Do not pollute tests with calls from initialize
      jest.clearAllMocks();
    });

    test.each`
      newEpoch | peerId
      ${5}     | ${mockedOracleAddresses[0].oraclePeerId}
      ${6}     | ${mockedOracleAddresses[1].oraclePeerId}
      ${7}     | ${mockedOracleAddresses[2].oraclePeerId}
      ${8}     | ${mockedOracleAddresses[3].oraclePeerId}
    `('should store received value $newEpoch for oracle $peerId', async ({ newEpoch, peerId }) => {
      const id = {
        toString: () => peerId
      } as unknown as PeerId;

      await onNewEpochReceived(id, {
        aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
        newEpoch: newEpoch
      });

      const { peersNewEpoch } = pacemakerService.getState();

      expect(peersNewEpoch).toEqual(new Map([[peerId, newEpoch]]));
    });

    test('should ignore messages for other aggregators', async () => {
      const id = {
        toString: () => mockedOracleAddresses[0].oraclePeerId
      } as unknown as PeerId;

      await onNewEpochReceived(id, {
        aggregatorAddress: 'Other aggregator',
        newEpoch: 5
      });

      const { peersNewEpoch } = pacemakerService.getState();

      expect(peersNewEpoch).toEqual(new Map());
    });

    test.each`
      values          | expected  | expectedNewEpoch
      ${[3, 3, 3, 3]} | ${'pass'} | ${3}
      ${[1, 5, 5, 5]} | ${'pass'} | ${5}
      ${[2, 5, 6, 7]} | ${'pass'} | ${5}
      ${[5, 6, 7, 8]} | ${'pass'} | ${6}
      ${[1, 1, 1, 1]} | ${'fail'} | ${2}
      ${[1, 2, 3, 4]} | ${'fail'} | ${2}
    `('should $expected amplification rule for values $values', async ({ values, expectedNewEpoch }) => {
      // Since there is 7 mocked oracles, f is 2.
      // So, amplification rule should pass with 3 newEpoch values over the current newEpoch (2)

      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );
      const { newEpoch } = pacemakerService.getState();

      expect(newEpoch).toEqual(expectedNewEpoch);
    });

    test('should broadcast newEpoch value if amplification rule pass', async () => {
      const values = [3, 3, 3];
      const expectedNewEpoch = 3;
      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );

      expect(mockBroadcastNewEpoch).toHaveBeenCalledTimes(1);
      expect(mockBroadcastNewEpoch).toHaveBeenCalledWith({
        aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
        newEpoch: expectedNewEpoch
      });
    });

    test('should not broadcast newEpoch value if amplification rule fail', async () => {
      const values = [1, 1, 1];
      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );

      expect(mockBroadcastNewEpoch).not.toHaveBeenCalled();
    });

    test.each`
      values                     | expected  | expectedEpoch
      ${[3, 3, 3, 3, 3, 3, 3]}   | ${'pass'} | ${3}
      ${[1, 5, 5, 5, 5, 5, 5]}   | ${'pass'} | ${5}
      ${[2, 5, 6, 7, 8, 9, 10]}  | ${'pass'} | ${6}
      ${[5, 6, 7, 8, 9, 10, 11]} | ${'pass'} | ${7}
      ${[7, 8, 9, 10, 11]}       | ${'pass'} | ${7}
      ${[1, 1, 1, 1, 1, 1, 1]}   | ${'fail'} | ${0}
      ${[1, 2, 2, 3, 4, 5, 6]}   | ${'fail'} | ${0}
      ${[3, 3, 3, 3]}            | ${'fail'} | ${0}
    `('should $expected agreement rule for values $values', async ({ values, expected, expectedEpoch }) => {
      // Since there is 7 mocked oracles, f is 2.
      // So, agreement rule should pass with 5 newEpoch values over the current epoch (2)

      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );

      if (expected === 'pass') {
        expect(mockStartReportGen).toHaveBeenCalledTimes(1);
        expect(mockStartReportGen).toHaveBeenCalledWith({
          epoch: expectedEpoch,
          leader: expect.anything(),
          aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
          aggregatorPair: PacemakerConfigMock.aggregatorPair,
          alpha: mockedBlockchainConfig.alphaPercentPerThousand,
          heartbeatSeconds: mockedBlockchainConfig.heartBeatSeconds,
          oracleAddresses: PacemakerConfigMock.oracleAddresses
        });
      } else {
        expect(mockStartReportGen).not.toHaveBeenCalled();
      }
    });

    test('should update newEpoch when agreement rule pass', async () => {
      // Since there is 7 mocked oracles, f is 2.
      // So, agreement rule should pass with 5 newEpoch values over the current epoch (2)

      const values = [3, 3, 3, 3, 3, 3, 3];
      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );

      const { newEpoch } = pacemakerService.getState();

      expect(newEpoch).toEqual(3);
    });

    test('should not update newEpoch when agreement rule fails', async () => {
      // Since there is 7 mocked oracles, f is 2.
      // So, agreement rule should pass with 5 newEpoch values over the current epoch (2)

      const values = [1, 1, 1, 1, 1, 1]; // We also don't want to trigger the amplification rule
      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );

      const { newEpoch } = pacemakerService.getState();

      expect(newEpoch).toEqual(mockedLastBlockchainReportEpoch);
    });

    test('should stop previous report gen when agreement rule pass', async () => {
      // Since there is 7 mocked oracles, f is 2.
      // So, agreement rule should pass with 5 newEpoch values over the current epoch (2)

      const values = [3, 3, 3, 3, 3, 3, 3];
      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );

      expect(mockStopReportGen).toHaveBeenCalledTimes(1);
      expect(mockStopReportGen).toHaveBeenCalledWith(PacemakerConfigMock.aggregatorAddress);
    });

    test('should not stop previous report gen when agreement rule fails', async () => {
      // Since there is 7 mocked oracles, f is 2.
      // So, agreement rule should pass with 5 newEpoch values over the current epoch (2)

      const values = [1, 2, 2, 3, 4, 5, 6];
      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );

      expect(mockStopReportGen).not.toHaveBeenCalled();
    });

    test('should restart progress timer when agreement rule pass', async () => {
      // Since there is 7 mocked oracles, f is 2.
      // So, agreement rule should pass with 5 newEpoch values over the current epoch (2)

      const values = [3, 3, 3, 3, 3, 3, 3];
      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );

      expect(timerProgress.restart).toHaveBeenCalledTimes(1);
    });

    test('should not restart progress timer when agreement rule pass', async () => {
      // Since there is 7 mocked oracles, f is 2.
      // So, agreement rule should pass with 5 newEpoch values over the current epoch (2)

      const values = [1, 2, 2, 3, 4, 5, 6];
      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );

      expect(timerProgress.restart).not.toHaveBeenCalled();
    });

    test('should emit startepoch if agreement rule pass and oracle is the leader', async () => {
      // Since there is 7 mocked oracles, f is 2.
      // So, agreement rule should pass with 5 newEpoch values over the current epoch (2)

      const listenerMock = jest.fn();
      eventHubServiceMock.addListener('startepoch', listenerMock);

      const values = [3, 3, 3, 3, 3, 3, 3];
      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );

      expect(listenerMock).toHaveBeenCalledTimes(1);
      expect(listenerMock).toHaveBeenCalledWith(
        PacemakerConfigMock.aggregatorAddress,
        3,
        OracleConfigMock.peerId
      );
    });

    test('should not emit startepoch if agreement rule pass and oracle is not the leader', async () => {
      // Since there is 7 mocked oracles, f is 2.
      // So, agreement rule should pass with 5 newEpoch values over the current epoch (2)

      const listenerMock = jest.fn();
      eventHubServiceMock.addListener('startepoch', listenerMock);

      const values = [4, 4, 4, 4, 4, 4, 4];
      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId
          } as PeerId)
      );

      await Promise.all(
        values.map((value, i) =>
          onNewEpochReceived(ids[i], {
            aggregatorAddress: PacemakerConfigMock.aggregatorAddress,
            newEpoch: value
          })
        )
      );

      expect(listenerMock).not.toHaveBeenCalled();
    });
  });
});
