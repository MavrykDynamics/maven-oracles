import { jest } from '@jest/globals';

export const mockInitialize = jest.fn();
export const PriceServiceMock = jest.fn().mockImplementation(() => {
  return { initialize: mockInitialize };
});
