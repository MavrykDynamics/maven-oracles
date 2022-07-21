import { INetworkConfig, NetworkName } from '../scripts/env';
import {
  OriginationOperation,
  TezosToolkit,
} from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import { saveContractAddress } from '../scripts/helpers';
import { MichelsonMap } from '@taquito/michelson-encoder';
import {
  AggregatorCode,
  AggregatorStorage,
} from '../aggregator';
import BigNumber from 'bignumber.js';

export const AGGREGATOR_SMART_CONTRACT_ADDRESS: unique symbol =
Symbol('AGGREGATOR_SMART_CONTRACT_ADDRESS');

export interface IMigrationResult {
  [AGGREGATOR_SMART_CONTRACT_ADDRESS]: string;
}

export default async function (
  networkConfig: INetworkConfig,
  networkName: NetworkName,
  saveToEnv: boolean = true
): Promise<IMigrationResult> {
  const toolkit = new TezosToolkit(networkConfig.networks[networkName].rpc);

  toolkit.setProvider({
    config: {
      confirmationPollingTimeoutSecond:
        networkConfig.confirmationPollingTimeoutSecond,
    },
    signer: await InMemorySigner.fromSecretKey(
      networkConfig.networks[networkName].secretKey
    ),
  });

  // AGGREGATOR CONTRACT ORIGINATION
  const aggregatorStorage: AggregatorStorage = {
    oracleAddresses: MichelsonMap.fromLiteral({
      "tz1eAoFgsys8PhTUvT3V3eq2BFaZp8UsGNsr": { // oracle1
        oraclePublicKey: "edpkv9DgHWm6HY6b35Mv77hgZcWrJVD4ADebp9RjYxXVmFvGs4VYi1",
        oraclePeerId: "12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1"
      },
      "tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm": { // oracle2
        oraclePublicKey: "edpkunKYLbEfRLKLtn9yi9avyjQbAAbQxuPVN759ajQEDKpp4RE6GV",
        oraclePeerId: "12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2"
      },
      "tz1PSmvRd3ySbh5aviFEMYGD6542LL5QnrMk": { // oracle3
        oraclePublicKey: "edpkuVjyKad7yCnNrCbGea7hi5Zh1zp5Cb1TvxUmnxC33fwKhq7daN",
        oraclePeerId: "12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3"
      },
      "tz1KrELvNVY4xKnujkXwrVLWuzWJEg9FvA8v": { // oracle4
        oraclePublicKey: "edpku7vkvS6XaWzFjmPDYULNyYrS7Rf1vHuoQ9FD8zVcaFNJ51bJ82",
        oraclePeerId: "12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34"
      },
      "tz1YKquTvvSE2B5kvGyf1AYeXD6b6cMDSzDe": { // oracle5
        oraclePublicKey: "edpkuqoXhgeXYZxn6yVWuy9UrWKazyahPaAbwnuZYknRefeLVVK3ar",
        oraclePeerId: "12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5"
      },
      "tz1TQ4fpSFNZ6D9vrcwBz9yzM2SNjDj5YoU7": { // oracle6
        oraclePublicKey: "edpkv6xHMqShSMr4CK3Vzg7mD1hina7eBkokrMoKpuYj55BVd18rjN",
        oraclePeerId: "12D3KooWEKXXjviRoWwoB37UzBT4qjUBbQH8bypWy3YWmyfvR736"
      },
      "tz1bPLbmiseCCWtW7RZ9t2RkNyboB9XT4exJ": { // oracle7
        oraclePublicKey: "edpku8MxEyEKHPsPeUBSBz5a5QbemdPbiQVsobdC3SnC9UDf4yMHTL",
        oraclePeerId: "12D3KooWRGcN9uh633ucfUJ3XQ69n31mB2jPHKtrw7mfCSJdLz97"
      },
    }) as MichelsonMap<string, string>,
    heartBeatSeconds: new BigNumber(60),
    alphaPercentPerThousand: new BigNumber(500),
    decimals: new BigNumber(8),
    lastResult: {
      price: new BigNumber(0),
      epoch: new BigNumber(0),
      round: new BigNumber(0),
      time: Date.now().toString()
    }
  };

  console.log('Originating Aggregator');
  const opAggragator: OriginationOperation = await toolkit.contract.originate({
    code: AggregatorCode,
    storage: aggregatorStorage,
  });
  console.log(
    `Aggregator origination done at: ${opAggragator.contractAddress}`
  );

  if (opAggragator.contractAddress === undefined) {
    throw new Error('Aggregator smart contract address not received');
  }

  if (saveToEnv) {
    await saveContractAddress(
      AGGREGATOR_SMART_CONTRACT_ADDRESS.description as string,
      opAggragator.contractAddress,
      networkName
    );
  }
  await opAggragator.confirmation();

  return {
    [AGGREGATOR_SMART_CONTRACT_ADDRESS]: opAggragator.contractAddress,
  };
}
