import { jest } from '@jest/globals';
import { MichelsonMap } from '@taquito/taquito';

export const mockInitialize = jest.fn();
export const mockGetAggregatorFactoryStorage = jest.fn().mockReturnValue(new MichelsonMap());

export const mockedLastBlockchainReportEpoch = 12;

export const mockGetLastBlockchainReport = jest.fn().mockReturnValue({
  epoch: mockedLastBlockchainReportEpoch
});

export const mockGetOraclesAddresses = jest.fn().mockReturnValue([]);
export const mockgetBlockchainConfig = jest.fn().mockReturnValue({});

export const ContractServiceMock = jest.fn().mockImplementation(() => {
  return {
    initialize: mockInitialize,
    getAggregatorFactoryStorage: mockGetAggregatorFactoryStorage,
    getLastBlockchainReport: mockGetLastBlockchainReport,
    getOraclesAddresses: mockGetOraclesAddresses,
    getBlockchainConfig: mockgetBlockchainConfig
  };
});
