import { NetworkName } from './scripts/env';
import BigNumber from 'bignumber.js';
import { MichelsonMap, MichelsonMapKey } from '@taquito/michelson-encoder';

export const oracleAddresses: MichelsonMap<MichelsonMapKey, unknown> = MichelsonMap.fromLiteral({
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
});

export const heartBeatSeconds: BigNumber =  new BigNumber(60);
export const alphaPercentPerThousand: BigNumber = new BigNumber(500);
export const decimals: BigNumber = new BigNumber(8);
export interface IAccount {
  pkh: string;
  sk: string;
  pk: string;
};

export type AccountName =
  | 'alice'
  | 'bob'
  | 'eve'
  | 'mallory'
  | 'oscar'
  | 'trudy'
  | 'isaac'
  | 'david'
  | 'susie'
  | 'ivan';

export const accounts: Record<AccountName, IAccount> = {
  alice: {
    pkh: 'tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb',
    sk: 'edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq',
    pk: 'edpkvGfYw3LyB1UcCahKQk4rF2tvbMUk8GFiTuMjL75uGXrpvKXhjn',
  },
  bob: {
    pkh: 'tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6',
    sk: 'edsk3RFfvaFaxbHx8BMtEW1rKQcPtDML3LXjNqMNLCzC3wLC1bWbAt',
    pk: 'edpkurPsQ8eUApnLUJ9ZPDvu98E8VNj4KtJa1aZr16Cr5ow5VHKnz4',
  },
  eve: {
    pkh: 'tz1MnmtP4uAcgMpeZN6JtyziXeFqqwQG6yn6',
    sk: 'edsk3Sb16jcx9KrgMDsbZDmKnuN11v4AbTtPBgBSBTqYftd8Cq3i1e',
    pk: 'edpku9qEgcyfNNDK6EpMvu5SqXDqWRLuxdMxdyH12ivTUuB1KXfGP4',
  },
  mallory: {
    pkh: 'tz1R2oNqANNy2vZhnZBJc8iMEqW79t85Fv7L',
    sk: 'edsk3W5Fz1yWK39sLY6vidmgkfmGAXh6V2JqUiri9W1pFeeYWbFbJL',
    pk: 'edpkujwsG5JMrWVXQwmRMBoR9yJkokRbn6wy3monpQKBpnZTs1ogRR',
  },
  oscar: {
    pkh: 'tz1VGyrip8uZDWoyssXDP7d1boGdpQcaaMXc',
    sk: 'edsk3Wz91mGzhGcq2jVnbTnfkyY7Zod8gdQp2dHfnzud5gRAJ2uoaK',
    pk: 'edpkvJm4eyR4vL7cY3B8zRyFMAGE4W8AuDtjio6v1GSm7dgS79rL23',
  },
  trudy: {
    pkh: 'tz1NdjbFHLxbKEUXhXgjyLfQSCbq6oy5b7Px',
    sk: 'edsk3ZBmJ3e34AhZViEanGN87QvayUQupJ28Q89xUpFFSv18xF2Lqf',
    pk: 'edpkv3sej4FWX2cUg8DR9F9QmsEb3YdodhDbVg1o1ooeWUDkuRGTsg',
  },
  isaac: {
    pkh: 'tz1Uqnf6CKSXTkhRNwkr59ZCkjM9TckqyzRb',
    sk: 'edsk3ULsmx8aEogiMs2T4Td8rLzfvd6Vv8D5CJqeKQKrsjZHVqRDrX',
    pk: 'edpkuZxa3i78gthryUa1aqh5AwuCqqLG7P55Tsh79pZaSryxZzhCVZ',
  },
  david: {
    pkh: 'tz1eeVgxwqeciAiB7t8qqp7jYPMQmGBaNotk',
    sk: 'edsk3S7NRL14arofJk4YESBzLaw9GMzweoVHSFsw4ycj7ya4BFgBp8',
    pk: 'edpkucHyjuibNhFC4ZMmidjurjr4BXPP95a9fLo1LTADvw3ztSp78p',
  },
  susie: {
    pkh: 'tz1brV73Mq4muSwhWUZM1KGaHTxzFQoC2Rmq',
    sk: 'edsk3YkX5ZcHQEBkVcEhukt9WpTextmQiiY93zEaj27fD1p1pf2k17',
    pk: 'edpkv8C5fAVfNEEWZivnumqGKRGz2aK2uNVVw72JheSUHmXGEUKsh5',
  },
  ivan: {
    pkh: 'tz1agyRPh6c42G3KN7kBFeieHfapUTYmaj8a',
    sk: 'edsk3UMB8zmwbiR1ynx4UZMQLukxkhv6PJTEv6H2cC2kj1m3NquTBB',
    pk: 'edpkukdsnybt7rMjmHp1t2eXX1iTdAFUmR5xUb9eqHsKLnk33UBaic',
  },
};

// tezos-client import secret key alice-test unencrypted:edskRkawwQimT7qNaw4g99dKh3ExUt3corurNLUwvYo2vwwAGdy6NK4At1QLEy9Km24TuwCFfr5k97wvDxKBn5iQqTxdvvpdjt  --force && tezos-client show address alice-test
// tezos-client import secret key alice-test unencrypted:edskRpPWgoNUfJgZRiycPg9539KMX6Ksw5yNVDw2ukds8VEgqXLLuBDrB6dr6m7fgsAZrLMDpPkxN7kRpcNyRzwkPYhoWsBJsZ  --force && tezos-client show address alice-test
// tezos-client import secret key alice-test unencrypted:edskRzrnZoreVanzsedvSDgWV1DkNycfjMXyri9LQLVYdXTXJrxNHzdtpouGJTQ1CrQiWK6ECvHCpoYfQ2LM7j8GjJdkjqrsLE  --force && tezos-client show address alice-test
// tezos-client import secret key alice-test unencrypted:edskRjjhoUjvSZ2eGgGpvcMk6SrtpajjkzGUXDpr2EAa25VTfdtNSoD1JLhEoEnotYR6ZtRC2bCk56kwf79eqgygrMeR145ENq  --force && tezos-client show address alice-test
// tezos-client import secret key alice-test unencrypted:edskRts3yovQnSAaK6WbyiaZdBnLk1cSeq8UEWo24xNyo1T6gZZ9yQpQ48YmvCwjjW1FpSgJ1LPZ9T3jazmh3HXLLKHDaJZVx2  --force && tezos-client show address alice-test

export const testnetAccounts: Record<AccountName, IAccount> = {
  alice: {
    pkh: 'tz1eAoFgsys8PhTUvT3V3eq2BFaZp8UsGNsr',
    sk: 'edskRkawwQimT7qNaw4g99dKh3ExUt3corurNLUwvYo2vwwAGdy6NK4At1QLEy9Km24TuwCFfr5k97wvDxKBn5iQqTxdvvpdjt',
    pk: 'edpkv9DgHWm6HY6b35Mv77hgZcWrJVD4ADebp9RjYxXVmFvGs4VYi1',
  },
  bob: {
    pkh: 'tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm',
    sk: 'edskRpPWgoNUfJgZRiycPg9539KMX6Ksw5yNVDw2ukds8VEgqXLLuBDrB6dr6m7fgsAZrLMDpPkxN7kRpcNyRzwkPYhoWsBJsZ',
    pk: 'edpkunKYLbEfRLKLtn9yi9avyjQbAAbQxuPVN759ajQEDKpp4RE6GV',
  },
  eve: {
    pkh: 'tz1PSmvRd3ySbh5aviFEMYGD6542LL5QnrMk',
    sk: 'edskRzrnZoreVanzsedvSDgWV1DkNycfjMXyri9LQLVYdXTXJrxNHzdtpouGJTQ1CrQiWK6ECvHCpoYfQ2LM7j8GjJdkjqrsLE',
    pk: 'edpkuVjyKad7yCnNrCbGea7hi5Zh1zp5Cb1TvxUmnxC33fwKhq7daN',
  },
  mallory: {
    pkh: 'tz1KrELvNVY4xKnujkXwrVLWuzWJEg9FvA8v',
    sk: 'edskRjjhoUjvSZ2eGgGpvcMk6SrtpajjkzGUXDpr2EAa25VTfdtNSoD1JLhEoEnotYR6ZtRC2bCk56kwf79eqgygrMeR145ENq',
    pk: 'edpku7vkvS6XaWzFjmPDYULNyYrS7Rf1vHuoQ9FD8zVcaFNJ51bJ82',
  },
  oscar: {
    pkh: 'tz1YKquTvvSE2B5kvGyf1AYeXD6b6cMDSzDe',
    sk: 'edskRts3yovQnSAaK6WbyiaZdBnLk1cSeq8UEWo24xNyo1T6gZZ9yQpQ48YmvCwjjW1FpSgJ1LPZ9T3jazmh3HXLLKHDaJZVx2',
    pk: 'edpkuqoXhgeXYZxn6yVWuy9UrWKazyahPaAbwnuZYknRefeLVVK3ar',
  },
  trudy: {
    pkh: 'tz1S3yZiTz316jY4NVVC4HFCgecMvryZ9Kk1',
    sk: 'edskRnLBuG23ucD8zD8pQKK9A1va5fVRNpSgK6JiDW5251mdJjFjkT9Lw9WipWxmivxG8gnr8swmnUuKcHrMxEEtThdszDkDP4',
    pk: '',
  },
  isaac: {
    pkh: 'tz1cPsRXpj1yA2nBSFtUo2HHLsgr6hDKWvCB',
    sk: 'edskRce5phNTy39eQAbe4gDmrr84HFmSrqmKRDLDj9c6VuuVEgeVtaaffXjfPNwMkhqQyvWdoufbDHqG2TvwnPwLfc8q7621po',
    pk: '',
  },
  david: {
    pkh: '',
    sk: '',
    pk: '',
  },
  susie: {
    pkh: '',
    sk: '',
    pk: '',
  },
  ivan: {
    pkh: '',
    sk: '',
    pk: '',
  },
};

export const testnetKmsAccounts: Record<AccountName, IAccount> = {
  alice: {
    pkh: 'tz3RTjXZkXJw3TvNsnKVL478CWYYNjfMRTCZ',
    sk: '',
    pk: '',
  },
  bob: {
    pkh: 'tz3MY7GYiud8Y9YVk2MnbftrxYvZVBh4Rbkq',
    sk: '',
    pk: '',
  },
  eve: {
    pkh: 'tz3Z8wLvEiauxuw4QHR4sjWNbDugB68NX8px',
    sk: '',
    pk: '',
  },
  mallory: {
    pkh: 'tz3N8cUSMpM5zknEzT7EuUCUmqYrv2A8o36P',
    sk: '',
    pk: '',
  },
  oscar: {
    pkh: '',
    sk: '',
    pk: '',
  },
  trudy: {
    pkh: '',
    sk: '',
    pk: '',
  },
  isaac: {
    pkh: '',
    sk: '',
    pk: '',
  },
  david: {
    pkh: '',
    sk: '',
    pk: '',
  },
  susie: {
    pkh: '',
    sk: '',
    pk: '',
  },
  ivan: {
    pkh: '',
    sk: '',
    pk: '',
  },
};

export const accountPerNetwork: Record<
  NetworkName,
  Record<AccountName, IAccount>
> = {
  ithacanet: testnetAccounts,
  'ithacanet-kms': testnetKmsAccounts,
  development: accounts,
  mainnet: testnetAccounts,
  hangzhounet: testnetAccounts,
};
