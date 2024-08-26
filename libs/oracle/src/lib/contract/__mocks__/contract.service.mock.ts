import { jest } from '@jest/globals';
import BigNumber from 'bignumber.js';
import { IAggregatorConfig } from '../contract.types.js';
import { verifyData } from '../../reportgen/index.js';
import { ContractService } from '../contract.service.js';
import { IOracleInformations, IOracleLastResultType } from '@mavrykdynamics/contracts';

export const mockInitialize = jest.fn();

export const mockedAggregatorAddresses: string[] = [
  'aggr'
];
export const mockGetAggregatorAddresses = jest.fn().mockReturnValue(mockedAggregatorAddresses);

// Be careful before modifying this value, some tests depends on epoch being 2
export const mockedLastBlockchainReportEpoch = 2;
export const mockedLastBlockchainReportRound = 2;
export const mockedLastBlockchainReportData = new BigNumber(100);
export const mockedLastBlockchainReportTime = Date.now() + 1_000_000_000; // very long time in the future
export const mockedLastBlockchainReportPercentOracleResponse = 10000;

export const mockGetLastBlockchainReport = jest.fn<ContractService['getLastBlockchainReport']>().mockResolvedValue({
  epoch: mockedLastBlockchainReportEpoch,
  data: mockedLastBlockchainReportData,
  round: mockedLastBlockchainReportRound,
  percentOracleResponse: mockedLastBlockchainReportPercentOracleResponse,
  lastUpdatedAt: mockedLastBlockchainReportTime
});

export const mockedName = "PAIR1/PAIR2";

export const mockGetName = jest.fn<ContractService['getName']>().mockResolvedValue(mockedName);

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


export const mockBlockchainLastCompletedData: IOracleLastResultType = {
  epoch: new BigNumber(mockedLastBlockchainReportEpoch),
  data: mockedLastBlockchainReportData,
  round: new BigNumber(mockedLastBlockchainReportRound),
  percentOracleResponse: new BigNumber(mockedLastBlockchainReportPercentOracleResponse),
  lastUpdatedAt: mockedLastBlockchainReportTime.toString()
};
export const mockedBlockchainConfig: IAggregatorConfig = {
  decimals: new BigNumber(8),
  alphaPercentPerThousand: new BigNumber(500),
  percentOracleThreshold: new BigNumber(500),
  heartBeatSeconds: new BigNumber(30),
  rewardAmountXtz: new BigNumber(1300),
  rewardAmountStakedMvk: new BigNumber(1300),
};
export const mockGetAggregatorConfig = jest
  .fn<ContractService['getAggregatorConfig']>()
  .mockResolvedValue(mockedBlockchainConfig);

export const mockSendReportBlockchain = jest.fn();

export const ContractServiceMock = jest.fn().mockImplementation(() => {
  return {
    initialize: mockInitialize,
    getLastBlockchainReport: mockGetLastBlockchainReport,
    getName: mockGetName,
    getOraclesAddresses: mockGetOraclesAddresses,
    getAggregatorAddresses: mockGetAggregatorAddresses,
    getAggregatorConfig: mockGetAggregatorConfig,
    verifyReportSignature: mockVerifyReportSignature,
    verifyAttestedReport: mockVerifyAttestedReport,
    signCompressedReport: mockSignCompressedReport,
    sendReportBlockchain: mockSendReportBlockchain
  };
});
