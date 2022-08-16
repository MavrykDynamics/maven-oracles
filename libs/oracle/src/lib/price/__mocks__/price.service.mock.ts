import { jest } from '@jest/globals';
import BigNumber from 'bignumber.js';

export const mockInitialize = jest.fn();

export const mockedPrice = new BigNumber(12);

export const mockGetPrice = jest.fn().mockReturnValue(mockedPrice);
export const PriceServiceMock = jest.fn().mockImplementation(() => {
  return { initialize: mockInitialize, getPrice: mockGetPrice };
});
