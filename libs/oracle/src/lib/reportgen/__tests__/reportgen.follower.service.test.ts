import {
  ContractServiceMock,
  mockedCompressedReport,
  mockedOracleAddresses,
  mockVerifyAttestedReport,
  mockVerifyReportSignature
} from '../../contract/__mocks__/contract.service.mock.js';
import { EventHubService } from '../../event-hub/index.js';
import { TimerMock } from '../../pacemaker/__mocks__/timer.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import type { ReportGenFollowerService as ReportGenFollowerServiceType } from '../reportgen.follower.service.js';
import {
  mockBroadcastFinalEcho,
  mockSendObserve,
  mockSendReport,
  ReportGenNetworkServiceMock
} from '../__mocks__/reportgen.network.service.mock.js';
import { ReportGenNetworkService } from '../reportgen.network.service.js';
import { ContractService } from '../../contract/index.js';
import { ReportGenConfigMock } from '../__mocks__/reportgen.config.mock.js';
import { afterEach, beforeEach, expect, jest } from '@jest/globals';
import { IReportGenEvents } from '../reportgen.types.js';
import {
  mockComputeMedian,
  mockedSignature,
  mockSignData,
  mockVerifyData
} from '../__mocks__/helpers.mock.js';

import { DataService } from '../../data/index.js';
import { mockedPrice, DataServiceMock } from '../../data/__mocks__/data.service.mock.js';
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
  const priceServiceMock = new DataServiceMock();
  const contractServiceMock: any = new ContractServiceMock();

  beforeEach(async () => {
    reportGenFollowerService = new ReportGenFollowerService(
      OracleConfigMock,
      reportGenNetworkServiceMock as unknown as ReportGenNetworkService,
      eventHubServiceMock as unknown as EventHubService,
      contractServiceMock as unknown as ContractService,
      priceServiceMock as unknown as DataService,
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

    mockVerifyData.mockResolvedValue(true);
    mockVerifyReportSignature.mockResolvedValue(true);
    mockVerifyAttestedReport.mockResolvedValue(true);
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
    const notTheLeader = {
      toString: () => mockedOracleAddresses[0].oraclePeerId, // oracle #0 is not the leader
      publicKey: mockedOracleAddresses[0].oraclePublicKey
    } as unknown as PeerId;
    const round = 1;

    test('should send observation', async () => {
      await onObserveReqReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        round: round
      });

      expect(mockSendObserve).toHaveBeenCalledTimes(1);
      expect(mockSendObserve).toHaveBeenCalledWith(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        round: round,
        epoch: ReportGenConfigMock.epoch,
        observation: mockedPrice,
        signature: mockedSignature
      });
    });

    test('should not send observation if aggregator address do not match', async () => {
      await onObserveReqReceived(leader, {
        aggregatorAddress: 'not the aggregator address',
        round: round
      });

      expect(mockSendObserve).not.toHaveBeenCalled();
    });

    test('should not send observation if sender is not the leader', async () => {
      await onObserveReqReceived(notTheLeader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        round: round
      });

      expect(mockSendObserve).not.toHaveBeenCalled();
    });

    test('should not send observation if round is behind', async () => {
      await onObserveReqReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        round: round - 1
      });

      expect(mockSendObserve).not.toHaveBeenCalled();
    });

    test('should not send observation if round is over max round number', async () => {
      await onObserveReqReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        round: 4 // max round number is 3
      });

      expect(mockSendObserve).not.toHaveBeenCalled();
    });
  });

  describe('on report req', () => {
    const leader = {
      toString: () => mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePeerId,
      publicKey: mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePublicKey
    } as unknown as PeerId;
    const notTheLeader = {
      toString: () => mockedOracleAddresses[0].oraclePeerId, // oracle #0 is not the leader
      publicKey: mockedOracleAddresses[0].oraclePublicKey
    } as unknown as PeerId;
    const round = 1;
    const observations = [
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
        oracle: mockedOracleAddresses[4].oraclePeerId,
        signature: new Uint8Array([4]),
        price: new BigNumber(4)
      },
      {
        oracle: mockedOracleAddresses[5].oraclePeerId,
        signature: new Uint8Array([5]),
        price: new BigNumber(5)
      }
    ];
    beforeEach(async () => {
      // Trigger setting round to 1
      await onObserveReqReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        round
      });
    });

    test('should send report', async () => {
      await onReportReqReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        report: {
          epoch: ReportGenConfigMock.epoch,
          round,
          observations
        }
      });

      expect(mockSendReport).toHaveBeenCalledTimes(1);
      expect(mockSendReport).toHaveBeenCalledWith(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        compressedReport: {
          epoch: ReportGenConfigMock.epoch,
          round: round,
          observations: observations.map(({ signature, ...rest }) => ({ ...rest }))
        },
        signature: {
          oracle: '',
          signature: mockedCompressedReport
        }
      });
    });

    test('should not send report if aggregator address do not match', async () => {
      await onReportReqReceived(leader, {
        aggregatorAddress: 'not the aggregator address',
        report: {
          epoch: ReportGenConfigMock.epoch,
          round,
          observations
        }
      });

      expect(mockSendReport).not.toHaveBeenCalled();
    });

    test('if sender is not the leader', async () => {
      await onReportReqReceived(notTheLeader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        report: {
          epoch: ReportGenConfigMock.epoch,
          round,
          observations
        }
      });

      expect(mockSendReport).not.toHaveBeenCalled();
    });

    test('should not send report if report observation is not sorted', async () => {
      await onReportReqReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        report: {
          epoch: ReportGenConfigMock.epoch,
          round,
          observations: [...observations].reverse()
        }
      });

      expect(mockSendReport).not.toHaveBeenCalled();
    });

    test.each`
      nObservation | expected
      ${0}         | ${'not send'}
      ${2}         | ${'not send'}
      ${3}         | ${'not send'}
      ${4}         | ${'not send'}
      ${5}         | ${'send'}
      ${6}         | ${'send'}
    `(
      'should $expect report when report contains $nObservation obervations',
      async ({ nObservation, expected }) => {
        // Since there is 7 mocked oracles, f is 2.
        // So, it should send when there is at least 5 observations (2*f +1)

        await onReportReqReceived(leader, {
          aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
          report: {
            epoch: ReportGenConfigMock.epoch,
            round,
            observations: observations.slice(0, nObservation)
          }
        });

        if (expected === 'send') {
          expect(mockSendReport).toHaveBeenCalledTimes(1);
        } else {
          expect(mockSendReport).not.toHaveBeenCalled();
        }
      }
    );

    test('should not send if signature verification fails', async () => {
      mockVerifyData.mockResolvedValue(false);

      await onReportReqReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        report: {
          epoch: ReportGenConfigMock.epoch,
          round,
          observations
        }
      });

      expect(mockSendReport).not.toHaveBeenCalled();
    });

    test('should emit progress if shouldReport check fails', async () => {
      // shouldReport check should fail if deviation is lower than alpha
      // So, to simulate it, we will set observations to previous median, so deviation will be 0
      const listener = jest.fn();
      eventHubServiceMock.addListener('progress', listener);
      mockComputeMedian.mockReturnValue(new BigNumber(100));

      await onReportReqReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        report: {
          epoch: ReportGenConfigMock.epoch,
          round,
          observations: observations
        }
      });

      expect(listener).toHaveBeenCalledTimes(1);
      eventHubServiceMock.removeListener('progress', listener);
    });
  });

  describe('on final', () => {
    const leader = {
      toString: () => mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePeerId,
      publicKey: mockedOracleAddresses[ReportGenConfigMock.epoch].oraclePublicKey
    } as unknown as PeerId;
    const notTheLeader = {
      toString: () => mockedOracleAddresses[0].oraclePeerId, // oracle #0 is not the leader
      publicKey: mockedOracleAddresses[0].oraclePublicKey
    } as unknown as PeerId;
    const round = 0;
    const observations = [
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
        oracle: mockedOracleAddresses[4].oraclePeerId,
        signature: new Uint8Array([4]),
        price: new BigNumber(4)
      },
      {
        oracle: mockedOracleAddresses[5].oraclePeerId,
        signature: new Uint8Array([5]),
        price: new BigNumber(5)
      }
    ];

    const signatures = [];

    test('should broadcast final echo', async () => {
      await onFinalReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        attestedReport: {
          epoch: ReportGenConfigMock.epoch,
          round,
          signatures,
          observations
        }
      });

      expect(mockBroadcastFinalEcho).toHaveBeenCalledTimes(1);
      expect(mockBroadcastFinalEcho).toHaveBeenCalledWith({
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        attestedReport: {
          epoch: ReportGenConfigMock.epoch,
          round,
          signatures,
          observations
        }
      });
    });

    test('should not broadcast final echo if aggregator address do not match', async () => {
      await onFinalReceived(leader, {
        aggregatorAddress: 'not the aggregator',
        attestedReport: {
          epoch: ReportGenConfigMock.epoch,
          round,
          signatures,
          observations
        }
      });

      expect(mockBroadcastFinalEcho).not.toHaveBeenCalled();
    });

    test('should not broadcast final echo if sender is not the leader', async () => {
      await onFinalReceived(notTheLeader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        attestedReport: {
          epoch: ReportGenConfigMock.epoch,
          round,
          signatures,
          observations
        }
      });

      expect(mockBroadcastFinalEcho).not.toHaveBeenCalled();
    });

    test('should not broadcast final echo if epoch do not match', async () => {
      await onFinalReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        attestedReport: {
          epoch: ReportGenConfigMock.epoch + 1, // mismatching epoch
          round,
          signatures,
          observations
        }
      });

      expect(mockBroadcastFinalEcho).not.toHaveBeenCalled();
    });

    test('should not broadcast final echo if round do not match', async () => {
      await onFinalReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        attestedReport: {
          epoch: ReportGenConfigMock.epoch,
          round: round + 1, // mismatching round
          signatures,
          observations
        }
      });

      expect(mockBroadcastFinalEcho).not.toHaveBeenCalled();
    });

    test('should not broadcast final echo if report verification fails', async () => {
      mockVerifyAttestedReport.mockResolvedValue(false);
      await onFinalReceived(leader, {
        aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
        attestedReport: {
          epoch: ReportGenConfigMock.epoch,
          round,
          signatures,
          observations
        }
      });

      expect(mockBroadcastFinalEcho).not.toHaveBeenCalled();
    });
  });

  describe('on final echo', () => {
    const transmitMock = jest.fn();
    const round = 0;
    const observations = [
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
        oracle: mockedOracleAddresses[4].oraclePeerId,
        signature: new Uint8Array([4]),
        price: new BigNumber(4)
      },
      {
        oracle: mockedOracleAddresses[5].oraclePeerId,
        signature: new Uint8Array([5]),
        price: new BigNumber(5)
      }
    ];
    const signatures = [];

    beforeEach(() => {
      eventHubServiceMock.addListener('transmit', transmitMock);
    });

    afterEach(() => {
      eventHubServiceMock.removeListener('transmit', transmitMock);
    });

    test('should transmit', async () => {
      const nReports = 3;
      const range = Array(nReports)
        .fill(1)
        .map((x, y) => x + y); // generate array of nReport element to iterate over

      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId,
            publicKey: addrs.oraclePublicKey
          } as unknown as PeerId)
      );

      await Promise.all(
        range.map((_, i) =>
          onFinalEchoReceived(ids[i], {
            aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
            attestedReport: {
              epoch: ReportGenConfigMock.epoch,
              round,
              signatures,
              observations
            }
          })
        )
      );

      expect(transmitMock).toHaveBeenCalledTimes(1);
      expect(transmitMock).toHaveBeenCalledWith(
        ReportGenConfigMock.aggregatorAddress,
        ReportGenConfigMock.oracleAddresses,
        {
          epoch: ReportGenConfigMock.epoch,
          round,
          observations,
          signatures
        },
        ReportGenConfigMock.alphaPerThousand
      );
    });

    test('should not transmit if oracles are unknown', async () => {
      const nReports = 3;
      const range = Array(nReports)
        .fill(1)
        .map((x, y) => x + y); // generate array of nReport element to iterate over

      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => `not oracle ${addrs.oraclePeerId}`, // make the oracle unknown by changing its peer id
            publicKey: addrs.oraclePublicKey
          } as unknown as PeerId)
      );

      await Promise.all(
        range.map((_, i) =>
          onFinalEchoReceived(ids[i], {
            aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
            attestedReport: {
              epoch: ReportGenConfigMock.epoch,
              round,
              signatures,
              observations
            }
          })
        )
      );

      expect(transmitMock).not.toHaveBeenCalled();
    });

    test('should not transmit if aggregator address do not match', async () => {
      const nReports = 3;
      const range = Array(nReports)
        .fill(1)
        .map((x, y) => x + y); // generate array of nReport element to iterate over

      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId,
            publicKey: addrs.oraclePublicKey
          } as unknown as PeerId)
      );

      await Promise.all(
        range.map((_, i) =>
          onFinalEchoReceived(ids[i], {
            aggregatorAddress: 'not the aggregator', // changed here
            attestedReport: {
              epoch: ReportGenConfigMock.epoch,
              round,
              signatures,
              observations
            }
          })
        )
      );

      expect(transmitMock).not.toHaveBeenCalled();
    });

    test('should not transmit if epoch do not match', async () => {
      const nReports = 3;
      const range = Array(nReports)
        .fill(1)
        .map((x, y) => x + y); // generate array of nReport element to iterate over

      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId,
            publicKey: addrs.oraclePublicKey
          } as unknown as PeerId)
      );

      await Promise.all(
        range.map((_, i) =>
          onFinalEchoReceived(ids[i], {
            aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
            attestedReport: {
              epoch: ReportGenConfigMock.epoch + 1, // changed here
              round,
              signatures,
              observations
            }
          })
        )
      );

      expect(transmitMock).not.toHaveBeenCalled();
    });

    test('should not transmit if round do not match', async () => {
      const nReports = 3;
      const range = Array(nReports)
        .fill(1)
        .map((x, y) => x + y); // generate array of nReport element to iterate over

      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId,
            publicKey: addrs.oraclePublicKey
          } as unknown as PeerId)
      );

      await Promise.all(
        range.map((_, i) =>
          onFinalEchoReceived(ids[i], {
            aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
            attestedReport: {
              epoch: ReportGenConfigMock.epoch,
              round: round + 1, // changed here
              signatures,
              observations
            }
          })
        )
      );

      expect(transmitMock).not.toHaveBeenCalled();
    });

    test('should not transmit if report verification fails', async () => {
      const nReports = 3;
      const range = Array(nReports)
        .fill(1)
        .map((x, y) => x + y); // generate array of nReport element to iterate over

      const ids = mockedOracleAddresses.map(
        (addrs) =>
          ({
            toString: () => addrs.oraclePeerId,
            publicKey: addrs.oraclePublicKey
          } as unknown as PeerId)
      );

      mockVerifyAttestedReport.mockResolvedValue(false);

      await Promise.all(
        range.map((_, i) =>
          onFinalEchoReceived(ids[i], {
            aggregatorAddress: ReportGenConfigMock.aggregatorAddress,
            attestedReport: {
              epoch: ReportGenConfigMock.epoch,
              round,
              signatures,
              observations
            }
          })
        )
      );

      expect(transmitMock).not.toHaveBeenCalled();
    });
  });
});
