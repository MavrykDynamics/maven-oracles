import { jest } from '@jest/globals';
import { MichelsonMap } from '@taquito/taquito';

export const mockInitialize = jest.fn();
export const mockGetAggregatorFactoryStorage = jest.fn().mockReturnValue(new MichelsonMap());

const ContractServiceMock = jest.fn().mockImplementation(() => {
  return { initialize: mockInitialize, getAggregatorFactoryStorage: mockGetAggregatorFactoryStorage };
});

export { ContractServiceMock };
