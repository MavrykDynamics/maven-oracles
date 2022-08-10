import { expect, jest } from '@jest/globals';
import {
  IFinalEchoMessage,
  IFinalMessage,
  IObserveMessage,
  IObserveReqMessage,
  IReportMessage,
  IReportReqMessage
} from '../reportgen.types.js';
import BigNumber from 'bignumber.js';
import { ReportGenNetworkService } from '../reportgen.network.service.js';

describe('ReportGenNetworkService', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('should correctly serialize and deserialize observe messages', () => {
    const message: IObserveMessage = {
      epoch: 5,
      round: 6,
      aggregatorAddress: 'aggregaddress',
      signature: new Uint8Array([1, 2, 3]),
      observation: new BigNumber(1_000_000_000_000_000_000)
    };

    const sezialized = ReportGenNetworkService.serializeObserveMessage(message);
    const desezialized = ReportGenNetworkService.deserializeObserveMessage(sezialized);

    expect(message).toEqual(desezialized);
  });

  test('should correctly serialize and deserialize report messages', () => {
    const message: IReportMessage = {
      aggregatorAddress: 'aggregaddress',
      signature: {
        oracle: 'oracle',
        signature: 'signature'
      },
      compressedReport: {
        epoch: 5,
        round: 6,
        observations: [
          {
            oracle: 'oracle1',
            price: new BigNumber(1_000_000_000_000_000_001)
          },
          {
            oracle: 'oracle2',
            price: new BigNumber(1_000_000_000_000_000_002)
          }
        ]
      }
    };
    const sezialized = ReportGenNetworkService.serializeReportMessage(message);
    const desezialized = ReportGenNetworkService.deserializeReportMessage(sezialized);

    expect(message).toEqual(desezialized);
  });

  test('should correctly serialize and deserialize observereq messages', () => {
    const message: IObserveReqMessage = {
      aggregatorAddress: 'aggregaddress',
      round: 6
    };
    const sezialized = ReportGenNetworkService.serializeObserveReqMessage(message);
    const desezialized = ReportGenNetworkService.deserializeObserveReqMessage(sezialized);

    expect(message).toEqual(desezialized);
  });

  test('should correctly serialize and deserialize reportreq messages', () => {
    const message: IReportReqMessage = {
      aggregatorAddress: 'aggregaddress',
      report: {
        epoch: 5,
        round: 6,
        observations: [
          {
            oracle: 'oracle1',
            price: new BigNumber(1_000_000_000_000_000_001),
            signature: new Uint8Array([1, 2, 3])
          },
          {
            oracle: 'oracle2',
            price: new BigNumber(1_000_000_000_000_000_002),
            signature: new Uint8Array([4, 5, 6])
          }
        ]
      }
    };
    const sezialized = ReportGenNetworkService.serializeReportReqMessage(message);
    const desezialized = ReportGenNetworkService.deserializeReportReqMessage(sezialized);

    expect(message).toEqual(desezialized);
  });

  test('should correctly serialize and deserialize final messages', () => {
    const message: IFinalMessage = {
      aggregatorAddress: 'aggregaddress',
      attestedReport: {
        epoch: 5,
        round: 6,
        observations: [
          {
            oracle: 'oracle1',
            price: new BigNumber(1_000_000_000_000_000_001)
          },
          {
            oracle: 'oracle2',
            price: new BigNumber(1_000_000_000_000_000_002)
          }
        ],
        signatures: [
          {
            oracle: 'oracle1',
            signature: 'sig1'
          },
          {
            oracle: 'oracle2',
            signature: 'sig2'
          }
        ]
      }
    };
    const sezialized = ReportGenNetworkService.serializeFinalMessage(message);
    const desezialized = ReportGenNetworkService.deserializeFinalMessage(sezialized);

    expect(message).toEqual(desezialized);
  });

  test('should correctly serialize and deserialize final echo messages', () => {
    const message: IFinalEchoMessage = {
      aggregatorAddress: 'aggregaddress',
      attestedReport: {
        epoch: 5,
        round: 6,
        observations: [
          {
            oracle: 'oracle1',
            price: new BigNumber(1_000_000_000_000_000_001)
          },
          {
            oracle: 'oracle2',
            price: new BigNumber(1_000_000_000_000_000_002)
          }
        ],
        signatures: [
          {
            oracle: 'oracle1',
            signature: 'sig1'
          },
          {
            oracle: 'oracle2',
            signature: 'sig2'
          }
        ]
      }
    };
    const sezialized = ReportGenNetworkService.serializeFinalEchoMessage(message);
    const desezialized = ReportGenNetworkService.deserializeFinalEchoMessage(sezialized);

    expect(message).toEqual(desezialized);
  });
});
