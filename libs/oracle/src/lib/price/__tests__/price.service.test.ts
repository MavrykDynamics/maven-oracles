import {
  ContractServiceMock,
  mockedAggregatorAddresses,
  mockedOracleAddresses
} from '../../contract/__mocks__/contract.service.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import { beforeEach, expect, jest } from '@jest/globals';
import type { PriceService as PriceServiceType } from '../price.service.js';
import {
  mockComputeMedian,
  mockSignData,
  mockVerifyData
} from '../../reportgen/__mocks__/helpers.mock';
import BigNumber from 'bignumber.js';
import { TimerMock } from '../../pacemaker/__mocks__/timer.mock.js';
import { MessariFetcherService } from '@tezosdynamics/messari-fetcher';
import { CoingeckoFetcherService } from '@tezosdynamics/coingecko-fetcher';
import { AlphavantageFetcherService } from '@tezosdynamics/alphavantage-fetcher';
import { MessariFetcherServiceMock } from '../__mocks__/messari-fetcher.service.mock.js';
import { AlphavantageFetcherServiceMock } from '../__mocks__/alphavantage-fetcher.service.mock.js';
import { CoingeckoFetcherServiceMock } from '../__mocks__/coingecko-fetcher.service.mock.js';

jest.unstable_mockModule('../../pacemaker/timer.js', async () => ({
  Timer: TimerMock
}));

jest.unstable_mockModule('../../reportgen/helpers.js', async () => ({
  verifyData: mockVerifyData,
  computeMedian: mockComputeMedian,
  signData: mockSignData
}));

// Use async import to make sure we get the mocked one
const { PriceService } = await import('../price.service.js');

describe('PriceService', () => {
  let priceService: PriceServiceType;
  let priceFetchers: any;
  const messariFetcherServiceMock = new MessariFetcherServiceMock();
  const coingeckoFetcherServiceMock = new CoingeckoFetcherServiceMock();
  const alphavantageFetcherServiceMock = new AlphavantageFetcherServiceMock();

  beforeEach(async () => {

    priceService = new PriceService(
      messariFetcherServiceMock as MessariFetcherService,
      coingeckoFetcherServiceMock as CoingeckoFetcherService,
      alphavantageFetcherServiceMock as AlphavantageFetcherService,
      OracleConfigMock
    );

    // @ts-expect-error
    priceFetchers = priceService._priceFetchers;
    
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('getPrice', () => {

    test('init - _priceFetchers should be not empty', async () => {
      expect(priceFetchers.length).toEqual(3);
    });
    
    const decimals: BigNumber = new BigNumber(3);
    const pair: [string, string] = ['usd','btc'];
    test('getPrice without fakePrice', async () => {
      const price = await priceService.getPrice(decimals, pair);
      expect((messariFetcherServiceMock as any).getPrice).toHaveBeenCalled();
      expect((coingeckoFetcherServiceMock as any).getPrice).toHaveBeenCalled();
      expect((alphavantageFetcherServiceMock as any).getPrice).toHaveBeenCalled();
      expect(price.toNumber()).toEqual(15000); // 15 * 1000 (3 decimals)
    });

    test('getPrice without fakePrice and on fetcher fail', async () => {
      priceFetchers[2] = AlphavantageFetcherServiceMock;
      const price = await priceService.getPrice(decimals, pair);
      expect((messariFetcherServiceMock as any).getPrice).toHaveBeenCalled();
      expect((coingeckoFetcherServiceMock as any).getPrice).toHaveBeenCalled();
      expect((alphavantageFetcherServiceMock as any).getPrice).not.toHaveBeenCalled();
      expect(price.toNumber()).toEqual(20000); // (15 + 25) / 2 * 1000 (3 decimals)
    });

    test('getPrice without fakePrice should fail because 0/3 fetcher answer', async () => {
      priceFetchers[0] = MessariFetcherServiceMock;
      priceFetchers[1] = CoingeckoFetcherServiceMock;
      priceFetchers[2] = AlphavantageFetcherServiceMock;

      await expect(priceService.getPrice(decimals, pair)).rejects.toThrow(`All price fetcher failed to fetch value for pair ${pair[0]}/${pair[1]}`);
      expect((messariFetcherServiceMock as any).getPrice).not.toHaveBeenCalled();
      expect((coingeckoFetcherServiceMock as any).getPrice).not.toHaveBeenCalled();
      expect((alphavantageFetcherServiceMock as any).getPrice).not.toHaveBeenCalled();
    });

    test('getPrice with fakePrice', async () => {
      OracleConfigMock.useFakePrices = true;
      priceService = new PriceService(
        messariFetcherServiceMock as MessariFetcherService,
        coingeckoFetcherServiceMock as CoingeckoFetcherService,
        alphavantageFetcherServiceMock as AlphavantageFetcherService,
        OracleConfigMock
      );

      const price = await priceService.getPrice(decimals, pair);
      expect((messariFetcherServiceMock as any).getPrice).not.toHaveBeenCalled();
      expect((coingeckoFetcherServiceMock as any).getPrice).not.toHaveBeenCalled();
      expect((alphavantageFetcherServiceMock as any).getPrice).not.toHaveBeenCalled();

      // between 100 * 1000 and 102 * 1000
      expect(price.toNumber()).toBeGreaterThanOrEqual(100000); 
      expect(price.toNumber()).toBeLessThanOrEqual(102000); 
    });

  });

  // describe('onTransmit', () => {
  //   beforeEach(async () => {
  //     await transmitService.initialize();
  //     jest.clearAllMocks();
  //   });

  //   test('onTransmit should go to doTransmit because: lastTransmitedReport === undefined', async () => {
  //       await transmitService.onTransmit(
  //         mockedAggregatorAddresses[0].aggregatorAddress,
  //         mockedOracleAddresses,
  //         mockedEmptyAttestedRepport
  //       );
  //     await timerTransmit.fakeTimeout();
  //     expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(2, mockedAggregatorAddresses[0].aggregatorAddress);
  //     expect((contractServiceMock as any).sendReportBlockchain).toHaveBeenCalledTimes(1);
  //     expect(timerTransmit.restart).toHaveBeenCalledTimes(1);      
  //   });

  //   test('onTransmit should go to doTransmit because: _isNewerEpochRound === true', async () => {
  //     lastTransmitedReport.set(mockedAggregatorAddresses[0].aggregatorAddress,{
  //       epoch: 2,
  //       round: 2,
  //       report: mockedEmptyAttestedRepport
  //     })
  //     await transmitService.onTransmit(
  //       mockedAggregatorAddresses[0].aggregatorAddress,
  //       mockedOracleAddresses,
  //       mockedEmptyAttestedRepport
  //     );
  //     await timerTransmit.fakeTimeout();
  //     expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(2, mockedAggregatorAddresses[0].aggregatorAddress);
  //     expect((contractServiceMock as any).sendReportBlockchain).toHaveBeenCalledTimes(1);
  //     expect(timerTransmit.restart).toHaveBeenCalledTimes(1);      
  //   });

  //   test('onTransmit should go to doTransmit because: Deviation is over threshold', async () => {
  //     mockComputeMedian.mockReturnValueOnce(new BigNumber(50));
  //     lastTransmitedReport.set(mockedAggregatorAddresses[0].aggregatorAddress,{
  //       epoch: 2,
  //       round: 2,
  //       report: mockedEmptyAttestedRepport
  //     })
  //     await transmitService.onTransmit(
  //       mockedAggregatorAddresses[0].aggregatorAddress,
  //       mockedOracleAddresses,
  //       mockedEmptyAttestedRepport
  //     );
  //     await timerTransmit.fakeTimeout();
  //     expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(2, mockedAggregatorAddresses[0].aggregatorAddress);
  //     expect((contractServiceMock as any).sendReportBlockchain).toHaveBeenCalledTimes(1);
  //     expect(timerTransmit.restart).toHaveBeenCalledTimes(1);      
  //   });

  //   test('onTransmit should go to doTransmit because: on _onTransmitTimerTimeout, this._reports.pop() === undefined', async () => {
  //     mockComputeMedian.mockReturnValueOnce(new BigNumber(50));
  //     lastTransmitedReport.set(mockedAggregatorAddresses[0].aggregatorAddress,{
  //       epoch: 2,
  //       round: 2,
  //       report: mockedEmptyAttestedRepport
  //     })
  //     await transmitService.onTransmit(
  //       mockedAggregatorAddresses[0].aggregatorAddress,
  //       mockedOracleAddresses,
  //       mockedEmptyAttestedRepport
  //     );
  //     reports.clear();
  //     await timerTransmit.fakeTimeout();
  //     expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(1, mockedAggregatorAddresses[0].aggregatorAddress);
  //     expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
  //     expect(timerTransmit.restart).toHaveBeenCalledTimes(1);       
  //   });

  //   test('onTransmit should go to doTransmit because: NOT TRANSMITTING', async () => {
  //     mockComputeMedian.mockReturnValueOnce(new BigNumber(50));
  //     lastTransmitedReport.set(mockedAggregatorAddresses[0].aggregatorAddress,{
  //       epoch: 2,
  //       round: 2,
  //       report: mockedEmptyAttestedRepport
  //     })
  //     await transmitService.onTransmit(
  //       mockedAggregatorAddresses[0].aggregatorAddress,
  //       mockedOracleAddresses,
  //       mockedEmptyAttestedRepport
  //     );
  //     reports.clear();
  //     reports.push({
  //       time: Date.now(),
  //       report: {
  //         epoch: 2,
  //         round: 0,
  //         observations: [],
  //         signatures: [],
  //       },
  //       aggregatorAddress: mockedAggregatorAddresses[0].aggregatorAddress,
  //       oracleAddresses: mockedOracleAddresses
  //     });
  //     reports.push({
  //       time: Date.now(),
  //       report: {
  //         epoch: 2,
  //         round: 0,
  //         observations: [],
  //         signatures: [],
  //       },
  //       aggregatorAddress: mockedAggregatorAddresses[0].aggregatorAddress,
  //       oracleAddresses: mockedOracleAddresses
  //     });
  //     await timerTransmit.fakeTimeout();
  //     expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(2, mockedAggregatorAddresses[0].aggregatorAddress);
  //     expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
  //     expect(timerTransmit.restart).toHaveBeenCalledTimes(2);      
  //   });

  //   test('onTransmit should go to doTransmit because: on _onTransmitTimerTimeout, this._reports.pop() === undefined', async () => {
  //     mockComputeMedian.mockReturnValueOnce(new BigNumber(50));
  //     lastTransmitedReport.set(mockedAggregatorAddresses[0].aggregatorAddress,{
  //       epoch: 2,
  //       round: 2,
  //       report: mockedEmptyAttestedRepport
  //     })
  //     await transmitService.onTransmit(
  //       mockedAggregatorAddresses[0].aggregatorAddress,
  //       mockedOracleAddresses,
  //       mockedEmptyAttestedRepport
  //     );
  //     reports.clear();
  //     await timerTransmit.fakeTimeout();
  //     expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(1, mockedAggregatorAddresses[0].aggregatorAddress);
  //     expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
  //     expect(timerTransmit.restart).toHaveBeenCalledTimes(1);       
  //   });

  //   test('onTransmit should not succeed because lastBlockchainReport is not null and last report on blockchain is more recent than epoch/round', async () => {
  //     await transmitService.onTransmit(
  //       mockedAggregatorAddresses[0].aggregatorAddress,
  //       mockedOracleAddresses,
  //       {
  //         epoch: 0, // 0 < 2
  //         round: 0,
  //         observations: [],
  //         signatures: [],
  //       }
  //     );
  //     expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(1, mockedAggregatorAddresses[0].aggregatorAddress);
  //     expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
  //     expect(timerTransmit.restart).not.toHaveBeenCalled();      
  //   });

  //   test('onTransmit should not succeed because lastBlockchainReport is null and last report on blockchain is more recent than epoch/round', async () => {
  //     (contractServiceMock as any).getLastBlockchainReport.mockResolvedValue(null);
  //     lastTransmitedReport.set(mockedAggregatorAddresses[0].aggregatorAddress,{
  //       epoch: 2,
  //       round: 2,
  //       report: mockedEmptyAttestedRepport
  //     })
  //     await transmitService.onTransmit(
  //       mockedAggregatorAddresses[0].aggregatorAddress,
  //       mockedOracleAddresses,
  //       {
  //         epoch: 0, // 0 < 2
  //         round: 0,
  //         observations: [],
  //         signatures: [],
  //       }
  //     );
  //     expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(1, mockedAggregatorAddresses[0].aggregatorAddress);
  //     expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
  //     expect(timerTransmit.restart).not.toHaveBeenCalled();      
  //   });

  //   test('onTransmit should not succeed because lastBlockchainReport is null and last report on blockchain is more recent than epoch/round', async () => {
  //     (contractServiceMock as any).getLastBlockchainReport.mockResolvedValue(null);
  //     lastTransmitedReport.set(mockedAggregatorAddresses[0].aggregatorAddress,{
  //       epoch: 3,
  //       round: 3,
  //       report: mockedEmptyAttestedRepport
  //     })
  //     await transmitService.onTransmit(
  //       mockedAggregatorAddresses[0].aggregatorAddress,
  //       mockedOracleAddresses,
  //       {
  //         epoch: 3, // 3 == 3
  //         round: 0, // 0 < 3
  //         observations: [],
  //         signatures: [],
  //       }
  //     );
  //     expect((contractServiceMock as any).getLastBlockchainReport).toHaveBeenNthCalledWith(1, mockedAggregatorAddresses[0].aggregatorAddress);
  //     expect((contractServiceMock as any).sendReportBlockchain).not.toHaveBeenCalled();
  //     expect(timerTransmit.restart).not.toHaveBeenCalled();      
  //   });

  // });

});