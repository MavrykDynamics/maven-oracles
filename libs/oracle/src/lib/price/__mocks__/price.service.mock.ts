import { jest } from '@jest/globals';
import BigNumber from 'bignumber.js';

export const mockInitialize = jest.fn();
export const mockGetPrice = jest.fn().mockReturnValue(new BigNumber(12));
export const PriceServiceMock = jest.fn().mockImplementation(() => {
  return { initialize: mockInitialize, getPrice: mockGetPrice };
});
