import { jest } from '@jest/globals';
import BigNumber from 'bignumber.js';
import { DataService } from '../data.service';

export const mockedPrice = new BigNumber(15);

export const mockGetData = jest
.fn<DataService['getData']>()
.mockResolvedValue(mockedPrice);export const CoingeckoFetcherServiceMock = jest.fn().mockImplementation(() => {
  return { 
    getData: mockGetData 
  };
});
