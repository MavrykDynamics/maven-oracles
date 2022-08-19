import { jest } from '@jest/globals';
import BigNumber from 'bignumber.js';
import { PriceService } from '../price.service';

export const mockedPrice = new BigNumber(10);

export const mockGetPrice = jest
.fn<PriceService['getPrice']>()
.mockResolvedValue(mockedPrice);export const AlphavantageFetcherServiceMock = jest.fn().mockImplementation(() => {
  return { 
    getPrice: mockGetPrice 
  };
});
