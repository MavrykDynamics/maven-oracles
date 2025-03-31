import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import { beforeEach, expect, jest } from '@jest/globals';
import type { ContractService as ContractServiceType } from '../contract.service.js';
import {
  IOracleInformations,
} from '@mavrykdynamics/contracts';

import BigNumber from 'bignumber.js';
import { TxManagerServiceMock } from '../__mocks__/tx-manager.service.mock.js';
import { IAttestedReport, IObservation } from 'src/lib/reportgen/index.js';


// Use async import to make sure we get the mocked one
const { ContractService } = await import('../contract.service.js');

describe('ContractService', () => {
  let contractService: ContractServiceType;
  let contractServiceOther: ContractServiceType;

  const txManagerServiceMock = new TxManagerServiceMock("edsk3ZBmJ3e34AhZViEanGN87QvayUQupJ28Q89xUpFFSv18xF2Lqf");
  const txManagerServiceMockOther = new TxManagerServiceMock("edsk3Sb16jcx9KrgMDsbZDmKnuN11v4AbTtPBgBSBTqYftd8Cq3i1e");

  beforeEach(async () => {
    contractService = new ContractService(
      OracleConfigMock,
      txManagerServiceMock as any
    );
    contractServiceOther = new ContractService(
      OracleConfigMock,
      txManagerServiceMockOther as any
    );
    
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  const aggregatorAddress: string = "KT1JWK133K5MssC645G7X7kQ3CXTimdTXApB";
  const oracleLedger: IOracleInformations[] = [
    {
      oracleAddress: "mv1AAFByPGTyFdbshgfA8ogjgf7pQKuR7ATp",
      oraclePublicKey: "edpku9qEgcyfNNDK6EpMvu5SqXDqWRLuxdMxdyH12ivTUuB1KXfGP4",
      oraclePeerId: "12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1"
    },
    {
      oracleAddress: "mv1B1CtqbiFwtWFkqrFbDAMRbDTofCSjHokn",
      oraclePublicKey: "edpkv3sej4FWX2cUg8DR9F9QmsEb3YdodhDbVg1o1ooeWUDkuRGTsg",
      oraclePeerId: "12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2"
    }
  ];

  describe('signCompressedReport and verifyReportSignature', () => {

    test('signCompressedReport and verifyReportSignature OK', async () => {
      const observations: IObservation[] = [
           {
              "oracle":"12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1",
              "data": new BigNumber(10142857143)
           },
           {
              "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
              "data": new BigNumber(10144537815)
           }
        ];
        const epoch: number = 2;
        const round: number = 1;
      const signature: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      expect(signature).not.toEqual('');

      const report = {
        "epoch":2,
        "round":1,
        "observations": observations
      }

      const verification: boolean = await contractService.verifyReportSignature(
        aggregatorAddress,
        oracleLedger,
        report,
        {
          oracle: "mv1B1CtqbiFwtWFkqrFbDAMRbDTofCSjHokn",
          signature
        }
      );
      expect(verification).toBeTruthy();
    });
    test('signCompressedReport should return empty signature because oracle addresses dont match', async () => {
      await contractService.onModuleInit()
      const observations: IObservation[] = [
           {
              "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
              "data": new BigNumber(10142857143)
           },
           {
              "oracle":"12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5",
              "data": new BigNumber(10144537815)
           }
        ];
        const epoch: number = 2;
        const round: number = 1;
      const signature: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      expect(signature).toEqual('');

    });

    test('sign ok but not verify report because oracle addresses dont match', async () => {
      const observations: IObservation[] = [
           {
              "oracle":"12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1",
              "data": new BigNumber(10142857143)
           },
           {
              "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
              "data": new BigNumber(10144537815)
           }
        ];
        const epoch: number = 2;
        const round: number = 1;
      const signature: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      expect(signature).not.toEqual('');

      const report = {
        "epoch":2,
        "round":1,
        "observations": [
          {
             "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
             "data": new BigNumber(10142857143)
          },
          {
             "oracle":"12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5",
             "data": new BigNumber(10144537815)
          }
       ]
      }

      const verification: boolean = await contractService.verifyReportSignature(
        aggregatorAddress,
        oracleLedger,
        report,
        {
          oracle: "mv1B1CtqbiFwtWFkqrFbDAMRbDTofCSjHokn",
          signature
        }
      );
      expect(verification).toBeFalsy();
    });

    test('sign ok but not verify report because oracle addresses dont match', async () => {
      const observations: IObservation[] = [
           {
              "oracle":"12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1",
              "data": new BigNumber(10142857143)
           },
           {
              "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
              "data": new BigNumber(10144537815)
           }
        ];
        const epoch: number = 2;
        const round: number = 1;
      const signature: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      expect(signature).not.toEqual('');

      const report = {
        "epoch":2,
        "round":1,
        "observations": observations
      }

      const verification: boolean = await contractService.verifyReportSignature(
        aggregatorAddress,
        oracleLedger,
        report,
        {
          oracle: "mv1FmXyQkcfufUw9zwW3Dyg1W3JMHcDZ8rV5",
          signature
        }
      );
      expect(verification).toBeFalsy();
    });

  });

  describe('verifyAttestedReport', () => {

    const observations: IObservation[] = [
      {
         "oracle":"12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1",
         "data": new BigNumber(10142857143)
      },
      {
         "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
         "data": new BigNumber(10144537815)
      }
    ];
    const epoch: number = 2;
    const round: number = 1;
    test('verifyAttestedReport OK', async () => {

      const signature1: string = await contractServiceOther.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      const signature2: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      expect(signature1).not.toEqual('');
      expect(signature2).not.toEqual('');

      const attestedReport: IAttestedReport = {
        epoch,
        round,
        observations,
        signatures: [
          {
            oracle: "mv1AAFByPGTyFdbshgfA8ogjgf7pQKuR7ATp",
            signature: signature1
          },
          {
            oracle: "mv1B1CtqbiFwtWFkqrFbDAMRbDTofCSjHokn",
            signature: signature2
          }
        ]
      }

      const verifiaction: boolean = await contractService.verifyAttestedReport(
        aggregatorAddress,
        attestedReport,
        oracleLedger,
        1
      );
      expect(verifiaction).toBeTruthy();
    });

    test('verifyAttestedReport should return false because mismatch with signature address', async () => {

      const signature1: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      const signature2: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      expect(signature1).not.toEqual('');
      expect(signature2).not.toEqual('');

      const attestedReport: IAttestedReport = {
        epoch,
        round,
        observations,
        signatures: [
          {
            oracle: "mv1PBrrrLGrp1oTnsoeTKtaSMNMmaosqhLgR",
            signature: signature1
          },
          {
            oracle: "mv1B1CtqbiFwtWFkqrFbDAMRbDTofCSjHokn",
            signature: signature2
          }
        ]
      }

      const verifiaction: boolean = await contractService.verifyAttestedReport(
        aggregatorAddress,
        attestedReport,
        oracleLedger,
        1
      );
      expect(verifiaction).toBeFalsy();
    });

    test('verifyAttestedReport throw', async () => {

      const signature1: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      const signature2: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      expect(signature1).not.toEqual('');
      expect(signature2).not.toEqual('');

      const wrongAddress: string = "12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p2";
      const attestedReport: IAttestedReport = {
        epoch,
        round,
        observations: [
          {
             "oracle": wrongAddress,
             "data": new BigNumber(10142857143)
          },
          {
             "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
             "data": new BigNumber(10144537815)
          }
        ],
        signatures: [
          {
            oracle: "mv1AAFByPGTyFdbshgfA8ogjgf7pQKuR7ATp",
            signature: signature1
          },
          {
            oracle: "mv1B1CtqbiFwtWFkqrFbDAMRbDTofCSjHokn",
            signature: signature2
          }
        ]
      };

      await expect(contractService.verifyAttestedReport(
        aggregatorAddress,
        attestedReport,
        oracleLedger,
        1
      )).rejects.toThrow(`Cannot pack report, missing oracle address for oracle ${wrongAddress}`);
    });

    test('verifyAttestedReport should return false because signatures length < f', async () => {

      const signature1: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      const signature2: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleLedger,
        observations,
        epoch,
        round
      );
      expect(signature1).not.toEqual('');
      expect(signature2).not.toEqual('');

      const attestedReport: IAttestedReport = {
        epoch,
        round,
        observations,
        signatures: [
          {
            oracle: "mv1AAFByPGTyFdbshgfA8ogjgf7pQKuR7ATp",
            signature: signature1
          },
          {
            oracle: "mv1B1CtqbiFwtWFkqrFbDAMRbDTofCSjHokn",
            signature: signature2
          }
        ]
      }

      const verifiaction: boolean = await contractService.verifyAttestedReport(
        aggregatorAddress,
        attestedReport,
        oracleLedger,
        2
      );
      expect(verifiaction).toBeFalsy();
    });
    

  });
});