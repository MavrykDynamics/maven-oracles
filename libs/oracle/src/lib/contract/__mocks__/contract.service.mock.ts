import { jest } from '@jest/globals';
import { IAggregatorInformations, IOracleInformations } from '@tezosdynamics/contracts';
import BigNumber from 'bignumber.js';
import { IAggregatorConfig } from '../contract.types.js';
import { verifyData } from '../../reportgen/index.js';
import { ContractService } from '../contract.service.js';

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
export const mockedLastBlockchainReportRound = 2;
export const mockedLastBlockchainReportPrice = new BigNumber(100);
export const mockedLastBlockchainReportTime = Date.now() + 1_000_000_000; // very long time in the future

export const mockGetLastBlockchainReport = jest.fn<ContractService['getLastBlockchainReport']>().mockResolvedValue({
  epoch: mockedLastBlockchainReportEpoch,
  price: mockedLastBlockchainReportPrice,
  round: mockedLastBlockchainReportRound,
  time: mockedLastBlockchainReportTime
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

export const mockGetOraclesAddresses = jest
  .fn<ContractService['getOraclesAddresses']>()
  .mockResolvedValue(mockedOracleAddresses);
export const mockVerifyReportSignature = jest
  .fn<ContractService['verifyReportSignature']>()
  .mockResolvedValue(true);
export const mockVerifyAttestedReport = jest
  .fn<ContractService['verifyAttestedReport']>()
  .mockResolvedValue(true);
export const mockedCompressedReport = 'mockedCompressedReport';
export const mockSignCompressedReport = jest
  .fn<ContractService['signCompressedReport']>()
  .mockResolvedValue(mockedCompressedReport);

export const mockedBlockchainConfig: IAggregatorConfig = {
  heartBeatSeconds: new BigNumber(30),
  decimals: new BigNumber(8),
  alphaPercentPerThousand: new BigNumber(500)
};
export const mockGetAggregatorConfig = jest
  .fn<ContractService['getAggregatorConfig']>()
  .mockResolvedValue(mockedBlockchainConfig);

export const mockSendReportBlockchain = jest.fn();

export const ContractServiceMock = jest.fn().mockImplementation(() => {
  return {
    initialize: mockInitialize,
    getAggregatorAddresses: mockGetAggregatorAddresses,
    getLastBlockchainReport: mockGetLastBlockchainReport,
    getOraclesAddresses: mockGetOraclesAddresses,
    getAggregatorConfig: mockGetAggregatorConfig,
    verifyReportSignature: mockVerifyReportSignature,
    verifyAttestedReport: mockVerifyAttestedReport,
    signCompressedReport: mockSignCompressedReport,
    sendReportBlockchain: mockSendReportBlockchain
  };
});
