import { jest } from '@jest/globals';
import { MichelsonMap } from '@taquito/taquito';
import { IAggregatorInformations, IOracleInformations } from '@tezosdynamics/contracts';
import BigNumber from 'bignumber.js';
import { IAggregatorConfig } from '../contract.types.js';

export const mockInitialize = jest.fn();

export const mockedAggregatorAddresses: IAggregatorInformations[] = [
  {
    aggregatorAddress: 'aggr',
    pair: ['TOTO', 'USD']
  }
];
export const mockGetAggregatorAddresses = jest.fn().mockReturnValue(mockedAggregatorAddresses);

export const mockedLastBlockchainReportEpoch = 12;

export const mockGetLastBlockchainReport = jest.fn().mockReturnValue({
  epoch: mockedLastBlockchainReportEpoch
});

export const mockedOracleAddresses: IOracleInformations[] = [
  {
    oracleAddress: 'oracle1/address',
    oraclePeerId: 'oracle1/peerId',
    oraclePublicKey: 'oracle1/publicKey'
  }
];
export const mockGetOraclesAddresses = jest.fn().mockReturnValue(mockedOracleAddresses);

export const mockedBlockchainConfig: IAggregatorConfig = {
  heartBeatSeconds: new BigNumber(30),
  decimals: new BigNumber(8),
  alphaPercentPerThousand: new BigNumber(500)
};
export const mockGetAggregatorConfig = jest.fn().mockReturnValue(mockedBlockchainConfig);

export const ContractServiceMock = jest.fn().mockImplementation(() => {
  return {
    initialize: mockInitialize,
    getAggregatorAddresses: mockGetAggregatorAddresses,
    getLastBlockchainReport: mockGetLastBlockchainReport,
    getOraclesAddresses: mockGetOraclesAddresses,
    getAggregatorConfig: mockGetAggregatorConfig
  };
});
