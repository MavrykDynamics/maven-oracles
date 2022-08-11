import { jest } from '@jest/globals';
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

// Be careful before modifying this value, some tests depends on epoch being 2
export const mockedLastBlockchainReportEpoch = 2;

export const mockGetLastBlockchainReport = jest.fn().mockReturnValue({
  epoch: mockedLastBlockchainReportEpoch
});

export const mockedOracleAddresses: IOracleInformations[] = [
  {
    oracleAddress: 'oracle1/address',
    oraclePeerId: 'oracle1/peerId',
    oraclePublicKey: 'oracle1/publicKey'
  },
  {
    oracleAddress: 'oracle2/address',
    oraclePeerId: 'oracle2/peerId',
    oraclePublicKey: 'oracle2/publicKey'
  },
  {
    oracleAddress: 'oracle3/address',
    oraclePeerId: 'oracle3/peerId',
    oraclePublicKey: 'oracle3/publicKey'
  },
  {
    oracleAddress: 'oracle4/address',
    oraclePeerId: 'oracle4/peerId',
    oraclePublicKey: 'oracle4/publicKey'
  },
  {
    oracleAddress: 'oracle5/address',
    oraclePeerId: 'oracle5/peerId',
    oraclePublicKey: 'oracle5/publicKey'
  },
  {
    oracleAddress: 'oracle6/address',
    oraclePeerId: 'oracle6/peerId',
    oraclePublicKey: 'oracle6/publicKey'
  },
  {
    oracleAddress: 'oracle7/address',
    oraclePeerId: 'oracle7/peerId',
    oraclePublicKey: 'oracle7/publicKey'
  }
];

export const mockGetOraclesAddresses = jest.fn().mockReturnValue(mockedOracleAddresses);
export const mockVerifyReportSignature = jest.fn().mockReturnValue(true);

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
    getAggregatorConfig: mockGetAggregatorConfig,
    verifyReportSignature: mockVerifyReportSignature
  };
});
