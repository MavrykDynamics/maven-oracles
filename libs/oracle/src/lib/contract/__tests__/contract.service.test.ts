import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import { EventHubService } from '../../event-hub/index.js';
import { beforeEach, expect, jest } from '@jest/globals';
import type { ContractService as ContractServiceType } from '../contract.service.js';
import {
  AggregatorFactoryContractAbstraction,
  IAggregatorInformations,
  IAggregatorStorage,
  IOracleInformations,
  IOracleObservationType
} from '@tezosdynamics/contracts';

import BigNumber from 'bignumber.js';
import { TimerMock } from '../../pacemaker/__mocks__/timer.mock.js';
import { TxManagerService } from '@tezosdynamics/tx-manager';
import { TxManagerServiceMock } from '../__mocks__/tx-manager.service.mock.js';
import { IAttestedReport, ICompressedReport, IObservation } from 'src/lib/reportgen/index.js';


// Use async import to make sure we get the mocked one
const { ContractService } = await import('../contract.service.js');

describe('ContractService', () => {
  let contractService: ContractServiceType;
  const txManagerServiceMock = new TxManagerServiceMock();

  beforeEach(async () => {

    contractService = new ContractService(
      OracleConfigMock,
      txManagerServiceMock as any
    );

    // @ts-expect-error
    // timerTransmit = transmitService._timerTransmit;
    
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  const aggregatorAddress: string = "KT1JWK133K5MssC645G7X7kQ3CXTimdTXApB";
  const oracleAddresses: IOracleInformations[] = [
    {
      oracleAddress: "tz1MnmtP4uAcgMpeZN6JtyziXeFqqwQG6yn6",
      oraclePublicKey: "edpku9qEgcyfNNDK6EpMvu5SqXDqWRLuxdMxdyH12ivTUuB1KXfGP4",
      oraclePeerId: "12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1"
    },
    {
      oracleAddress: "tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm",
      oraclePublicKey: "edpkunKYLbEfRLKLtn9yi9avyjQbAAbQxuPVN759ajQEDKpp4RE6GV",
      oraclePeerId: "12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2"
    }
  ];

  describe('signCompressedReport and verifyReportSignature', () => {

    test('signCompressedReport and verifyReportSignature OK', async () => {
      const observations: IObservation[] = [
           {
              "oracle":"12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1",
              "price": new BigNumber(10142857143)
           },
           {
              "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
              "price": new BigNumber(10144537815)
           }
        ];
        const secretKey: string = "edskRpPWgoNUfJgZRiycPg9539KMX6Ksw5yNVDw2ukds8VEgqXLLuBDrB6dr6m7fgsAZrLMDpPkxN7kRpcNyRzwkPYhoWsBJsZ"; // oracle2
        const epoch: number = 2;
        const round: number = 1;
      const signature: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey,
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
        oracleAddresses,
        report,
        {
          oracle: "tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm",
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
              "price": new BigNumber(10142857143)
           },
           {
              "oracle":"12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5",
              "price": new BigNumber(10144537815)
           }
        ];
        const secretKey: string = "edskRpPWgoNUfJgZRiycPg9539KMX6Ksw5yNVDw2ukds8VEgqXLLuBDrB6dr6m7fgsAZrLMDpPkxN7kRpcNyRzwkPYhoWsBJsZ"; // oracle2
        const epoch: number = 2;
        const round: number = 1;
      const signature: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey,
        epoch,
        round
      );
      expect(signature).toEqual('');

    });

    test('sign ok but not verify report because oracle addresses dont match', async () => {
      const observations: IObservation[] = [
           {
              "oracle":"12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1",
              "price": new BigNumber(10142857143)
           },
           {
              "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
              "price": new BigNumber(10144537815)
           }
        ];
        const secretKey: string = "edskRpPWgoNUfJgZRiycPg9539KMX6Ksw5yNVDw2ukds8VEgqXLLuBDrB6dr6m7fgsAZrLMDpPkxN7kRpcNyRzwkPYhoWsBJsZ"; // oracle2
        const epoch: number = 2;
        const round: number = 1;
      const signature: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey,
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
             "price": new BigNumber(10142857143)
          },
          {
             "oracle":"12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5",
             "price": new BigNumber(10144537815)
          }
       ]
      }

      const verification: boolean = await contractService.verifyReportSignature(
        aggregatorAddress,
        oracleAddresses,
        report,
        {
          oracle: "tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm",
          signature
        }
      );
      expect(verification).toBeFalsy();
    });

    test('sign ok but not verify report because oracle addresses dont match', async () => {
      const observations: IObservation[] = [
           {
              "oracle":"12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1",
              "price": new BigNumber(10142857143)
           },
           {
              "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
              "price": new BigNumber(10144537815)
           }
        ];
        const secretKey: string = "edskRpPWgoNUfJgZRiycPg9539KMX6Ksw5yNVDw2ukds8VEgqXLLuBDrB6dr6m7fgsAZrLMDpPkxN7kRpcNyRzwkPYhoWsBJsZ"; // oracle2
        const epoch: number = 2;
        const round: number = 1;
      const signature: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey,
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
        oracleAddresses,
        report,
        {
          oracle: "tz1TQ4fpSFNZ6D9vrcwBz9yzM2SNjDj5YoU7",
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
         "price": new BigNumber(10142857143)
      },
      {
         "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
         "price": new BigNumber(10144537815)
      }
    ];
    const secretKey1: string = "edsk3Sb16jcx9KrgMDsbZDmKnuN11v4AbTtPBgBSBTqYftd8Cq3i1e"; // oracle1
    const secretKey2: string = "edskRpPWgoNUfJgZRiycPg9539KMX6Ksw5yNVDw2ukds8VEgqXLLuBDrB6dr6m7fgsAZrLMDpPkxN7kRpcNyRzwkPYhoWsBJsZ"; // oracle2
    const epoch: number = 2;
    const round: number = 1;
    test('verifyAttestedReport OK', async () => {

      const signature1: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey1,
        epoch,
        round
      );
      const signature2: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey2,
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
            oracle: "tz1MnmtP4uAcgMpeZN6JtyziXeFqqwQG6yn6",
            signature: signature1
          },
          {
            oracle: "tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm",
            signature: signature2
          }
        ]
      }

      const verifiaction: boolean = await contractService.verifyAttestedReport(
        aggregatorAddress,
        attestedReport,
        oracleAddresses,
        1
      );
      expect(verifiaction).toBeTruthy();
    });

    test('verifyAttestedReport should return false because mismatch with signature address', async () => {

      const signature1: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey1,
        epoch,
        round
      );
      const signature2: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey2,
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
            oracle: "tz1KrELvNVY4xKnujkXwrVLWuzWJEg9FvA8v",
            signature: signature1
          },
          {
            oracle: "tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm",
            signature: signature2
          }
        ]
      }

      const verifiaction: boolean = await contractService.verifyAttestedReport(
        aggregatorAddress,
        attestedReport,
        oracleAddresses,
        1
      );
      expect(verifiaction).toBeFalsy();
    });

    test('verifyAttestedReport throw', async () => {

      const signature1: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey1,
        epoch,
        round
      );
      const signature2: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey2,
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
             "price": new BigNumber(10142857143)
          },
          {
             "oracle":"12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
             "price": new BigNumber(10144537815)
          }
        ],
        signatures: [
          {
            oracle: "tz1MnmtP4uAcgMpeZN6JtyziXeFqqwQG6yn6",
            signature: signature1
          },
          {
            oracle: "tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm",
            signature: signature2
          }
        ]
      };

      await expect(contractService.verifyAttestedReport(
        aggregatorAddress,
        attestedReport,
        oracleAddresses,
        1
      )).rejects.toThrow(`Cannot pack report, missing oracle address for oracle ${wrongAddress}`);
    });

    test('verifyAttestedReport should return false because signatures length < f', async () => {

      const signature1: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey1,
        epoch,
        round
      );
      const signature2: string = await contractService.signCompressedReport(
        aggregatorAddress,
        oracleAddresses,
        observations,
        secretKey2,
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
            oracle: "tz1MnmtP4uAcgMpeZN6JtyziXeFqqwQG6yn6",
            signature: signature1
          },
          {
            oracle: "tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm",
            signature: signature2
          }
        ]
      }

      const verifiaction: boolean = await contractService.verifyAttestedReport(
        aggregatorAddress,
        attestedReport,
        oracleAddresses,
        2
      );
      expect(verifiaction).toBeFalsy();
    });
    

  });
});