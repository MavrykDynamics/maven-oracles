import { NetworkName } from './scripts/env.js';
import BigNumber from 'bignumber.js';
import { MichelsonMap, MichelsonMapKey } from '@taquito/michelson-encoder';

export const oracleLedger: MichelsonMap<MichelsonMapKey, unknown> = MichelsonMap.fromLiteral({
  tz1MnmtP4uAcgMpeZN6JtyziXeFqqwQG6yn6: {
    // oracle1
    oraclePublicKey: 'edpku9qEgcyfNNDK6EpMvu5SqXDqWRLuxdMxdyH12ivTUuB1KXfGP4',
    oraclePeerId: '12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1'
  },
  tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm: {
    // oracle2
    oraclePublicKey: 'edpkunKYLbEfRLKLtn9yi9avyjQbAAbQxuPVN759ajQEDKpp4RE6GV',
    oraclePeerId: '12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2'
  },
  tz1PSmvRd3ySbh5aviFEMYGD6542LL5QnrMk: {
    // oracle3
    oraclePublicKey: 'edpkuVjyKad7yCnNrCbGea7hi5Zh1zp5Cb1TvxUmnxC33fwKhq7daN',
    oraclePeerId: '12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3'
  },
  tz1KrELvNVY4xKnujkXwrVLWuzWJEg9FvA8v: {
    // oracle4
    oraclePublicKey: 'edpku7vkvS6XaWzFjmPDYULNyYrS7Rf1vHuoQ9FD8zVcaFNJ51bJ82',
    oraclePeerId: '12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34'
  },
  tz1YKquTvvSE2B5kvGyf1AYeXD6b6cMDSzDe: {
    // oracle5
    oraclePublicKey: 'edpkuqoXhgeXYZxn6yVWuy9UrWKazyahPaAbwnuZYknRefeLVVK3ar',
    oraclePeerId: '12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5'
  },
  tz1TQ4fpSFNZ6D9vrcwBz9yzM2SNjDj5YoU7: {
    // oracle6
    oraclePublicKey: 'edpkv6xHMqShSMr4CK3Vzg7mD1hina7eBkokrMoKpuYj55BVd18rjN',
    oraclePeerId: '12D3KooWEKXXjviRoWwoB37UzBT4qjUBbQH8bypWy3YWmyfvR736'
  },
  tz1bPLbmiseCCWtW7RZ9t2RkNyboB9XT4exJ: {
    // oracle7
    oraclePublicKey: 'edpku8MxEyEKHPsPeUBSBz5a5QbemdPbiQVsobdC3SnC9UDf4yMHTL',
    oraclePeerId: '12D3KooWRGcN9uh633ucfUJ3XQ69n31mB2jPHKtrw7mfCSJdLz97'
  }
});

export const heartBeatSeconds: BigNumber = new BigNumber(3);
export const alphaPercentPerThousand: BigNumber = new BigNumber(2);
export const percentOracleThreshold: BigNumber = new BigNumber(2);
export const rewardAmountStakedMvk: BigNumber = new BigNumber(10000000);
export const rewardAmountXtz: BigNumber = new BigNumber(1300);
export const decimals: BigNumber = new BigNumber(8);
export const zeroAddress: string = 'tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg';
export interface IAccount {
  pkh: string;
  sk: string;
  pk: string;
}

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
      pkh: "tz1Rf4qAP6ZK19hR6Xwcwqz5778PnwNLPDBM",
      sk: "edskS5Xd6CDBLbuJwkaa7mT2K6mom4odhbBiS3bxDtAB1crXWj4gwKF5oQsN9aijR3CNpr7cZXxcoUU32vqm67W3MRGSTVzMmz",
      pk: "edpku8CdxqUzHhL8X3fgpCX5CfmqxUU7JWBTmXwqUATt78dGijvqWd",
  },
  bob: {
      pkh: "tz1ezDb77a9jaFMHDWs8QXrKEDkpgGdgsjPD",
      sk: "edskSA1MhTp6Eq3T79MEP822eXAmxXBk89eFYGgwBsJjfyUHDGsYfudasQocwcb5DUEMvA1B3EsvxCZ8G6Wek6syxAA49DEKzq",
      pk: "edpktqePwpgrWGS49FiAMDacb3bLiDLE8BrbLoi6zYdcZ9bttDLo1D",
  },
  eve: {
      pkh: "tz1bfkfgQ8EsH9wrFXueAvm8rKRxzab1vQH1",
      sk: "edskRvgMBH37Dci9isEHcdsHQ4ioPdUq3AfXDiAj3ZXiuy3YMs4LEUiZVMaSG9KjTFo78LidgZkdVbkXUamMK2or8UAxB743SH",
      pk: "edpkv758sKsFGRwE3ZNDR1wdVEnxZui344fsxEtCKbpNMcTaQw2Yis",
  },
  mallory: {
      pkh: "tz1TJTq4Rcx4hqCxkGnmwJRpqeDNzoEpjk6n",
      sk: "edsk3bVbowf9hFpdk8mAjZ8qSKzRTcFTgfqdoY4txdQrUhGHJGruXB",
      pk: "edpkv6mD1SBoUB45g6Ss3LYfYzqZGxRfA3dehYBxEvGidFzsCg6yXQ",
  },
  oscar: {
      pkh: "tz1Zgg2vLeyYLwQCtChXKjYDAXCRowQTzEGw",
      sk: "edsk32TqRuUFWHE6jwrPgbk5M9A3Sbs4shY4dh1WJCMR1fJjoV6iNs",
      pk: "edpkuTgScYTtrvAtTU6UMF44NvNd51ah1aqNeerNFC38bGZrKVXwFP",
  },
  trudy: {
      pkh: "tz1dQNGEDPoapnJaK1nX5boVHYKcdtoMjKSq",
      sk: "edsk3AbmsisVnZtkyVvY1jkyNpSTcRhW3hepihBLTu6e5sUaTS2x1c",
      pk: "edpkubMsp1wdfpARu3ZsHKwrtkR9PQiAN8nsACP2hiksb7oM5aUhpu",
  },
  isaac: {
      pkh: "tz1SDg2Wah3wBHFwCK5gYV591BhpLWZTWX42",
      sk: "edsk3ahGaSWjzjHuS7mK5Bsy7LxH8iTRXpGcMvzjgSypKHKw2wrq1u",
      pk: "edpktpYJesCTU55qxTy2RjdBUupRzVUM3Ek4VzVFxZjypLXPJSaTdn",
  },
  david: {
      pkh: "tz1PPLFcQyechtAm9XRZWRnMEXJ8NsXUNGdS",
      sk: "edsk3hwth6tL9hppsUT6sZQ5687DDY9GPgKiZgjg9DDcMjJxoRUsGc",
      pk: "edpkvK4zfvkuzHmbh2CofrBmQ52jrk3b23puVdJkTJCFmHZTLapSWB",
  },
  susie: {
      pkh: "tz1TQ4fpSFNZ6D9vrcwBz9yzM2SNjDj5YoU7",
      sk: "edsk2vtJ2rVoHoA3GbgDjyT5zbeVMDXZ6R4YjDskKaapgsRtiEWpaP",
      pk: "edpkv6xHMqShSMr4CK3Vzg7mD1hina7eBkokrMoKpuYj55BVd18rjN",
  },
  ivan: {
      pkh: "tz1bPLbmiseCCWtW7RZ9t2RkNyboB9XT4exJ",
      sk: "edsk4AzUdwSFu383eMf8eve56Q2pJxy1eWt4BnzKkLKMdKurHgTeaf",
      pk: "edpku8MxEyEKHPsPeUBSBz5a5QbemdPbiQVsobdC3SnC9UDf4yMHTL",
  }
};

// tezos-client import secret key alice-test unencrypted:edsk3Sb16jcx9KrgMDsbZDmKnuN11v4AbTtPBgBSBTqYftd8Cq3i1e  --force && tezos-client show address alice-test
// tezos-client import secret key alice-test unencrypted:edskRpPWgoNUfJgZRiycPg9539KMX6Ksw5yNVDw2ukds8VEgqXLLuBDrB6dr6m7fgsAZrLMDpPkxN7kRpcNyRzwkPYhoWsBJsZ  --force && tezos-client show address alice-test
// tezos-client import secret key alice-test unencrypted:edskRzrnZoreVanzsedvSDgWV1DkNycfjMXyri9LQLVYdXTXJrxNHzdtpouGJTQ1CrQiWK6ECvHCpoYfQ2LM7j8GjJdkjqrsLE  --force && tezos-client show address alice-test
// tezos-client import secret key alice-test unencrypted:edskRjjhoUjvSZ2eGgGpvcMk6SrtpajjkzGUXDpr2EAa25VTfdtNSoD1JLhEoEnotYR6ZtRC2bCk56kwf79eqgygrMeR145ENq  --force && tezos-client show address alice-test
// tezos-client import secret key alice-test unencrypted:edskRts3yovQnSAaK6WbyiaZdBnLk1cSeq8UEWo24xNyo1T6gZZ9yQpQ48YmvCwjjW1FpSgJ1LPZ9T3jazmh3HXLLKHDaJZVx2  --force && tezos-client show address alice-test

export const testnetAccounts: Record<AccountName, IAccount> = {
  alice: {
      pkh: "tz1Rf4qAP6ZK19hR6Xwcwqz5778PnwNLPDBM",
      sk: "edskS5Xd6CDBLbuJwkaa7mT2K6mom4odhbBiS3bxDtAB1crXWj4gwKF5oQsN9aijR3CNpr7cZXxcoUU32vqm67W3MRGSTVzMmz",
      pk: "edpku8CdxqUzHhL8X3fgpCX5CfmqxUU7JWBTmXwqUATt78dGijvqWd",
  },
  bob: {
      pkh: "tz1ezDb77a9jaFMHDWs8QXrKEDkpgGdgsjPD",
      sk: "edskSA1MhTp6Eq3T79MEP822eXAmxXBk89eFYGgwBsJjfyUHDGsYfudasQocwcb5DUEMvA1B3EsvxCZ8G6Wek6syxAA49DEKzq",
      pk: "edpktqePwpgrWGS49FiAMDacb3bLiDLE8BrbLoi6zYdcZ9bttDLo1D",
  },
  eve: {
      pkh: "tz1bfkfgQ8EsH9wrFXueAvm8rKRxzab1vQH1",
      sk: "edskRvgMBH37Dci9isEHcdsHQ4ioPdUq3AfXDiAj3ZXiuy3YMs4LEUiZVMaSG9KjTFo78LidgZkdVbkXUamMK2or8UAxB743SH",
      pk: "edpkv758sKsFGRwE3ZNDR1wdVEnxZui344fsxEtCKbpNMcTaQw2Yis",
  },
  mallory: {
      pkh: "tz1TJTq4Rcx4hqCxkGnmwJRpqeDNzoEpjk6n",
      sk: "edsk3bVbowf9hFpdk8mAjZ8qSKzRTcFTgfqdoY4txdQrUhGHJGruXB",
      pk: "edpkv6mD1SBoUB45g6Ss3LYfYzqZGxRfA3dehYBxEvGidFzsCg6yXQ",
  },
  oscar: {
      pkh: "tz1Zgg2vLeyYLwQCtChXKjYDAXCRowQTzEGw",
      sk: "edsk32TqRuUFWHE6jwrPgbk5M9A3Sbs4shY4dh1WJCMR1fJjoV6iNs",
      pk: "edpkuTgScYTtrvAtTU6UMF44NvNd51ah1aqNeerNFC38bGZrKVXwFP",
  },
  trudy: {
      pkh: "tz1dQNGEDPoapnJaK1nX5boVHYKcdtoMjKSq",
      sk: "edsk3AbmsisVnZtkyVvY1jkyNpSTcRhW3hepihBLTu6e5sUaTS2x1c",
      pk: "edpkubMsp1wdfpARu3ZsHKwrtkR9PQiAN8nsACP2hiksb7oM5aUhpu",
  },
  isaac: {
      pkh: "tz1SDg2Wah3wBHFwCK5gYV591BhpLWZTWX42",
      sk: "edsk3ahGaSWjzjHuS7mK5Bsy7LxH8iTRXpGcMvzjgSypKHKw2wrq1u",
      pk: "edpktpYJesCTU55qxTy2RjdBUupRzVUM3Ek4VzVFxZjypLXPJSaTdn",
  },
  david: {
      pkh: "tz1PPLFcQyechtAm9XRZWRnMEXJ8NsXUNGdS",
      sk: "edsk3hwth6tL9hppsUT6sZQ5687DDY9GPgKiZgjg9DDcMjJxoRUsGc",
      pk: "edpkvK4zfvkuzHmbh2CofrBmQ52jrk3b23puVdJkTJCFmHZTLapSWB",
  },
  susie: {
      pkh: "tz1TQ4fpSFNZ6D9vrcwBz9yzM2SNjDj5YoU7",
      sk: "edsk2vtJ2rVoHoA3GbgDjyT5zbeVMDXZ6R4YjDskKaapgsRtiEWpaP",
      pk: "edpkv6xHMqShSMr4CK3Vzg7mD1hina7eBkokrMoKpuYj55BVd18rjN",
  },
  ivan: {
      pkh: "tz1bPLbmiseCCWtW7RZ9t2RkNyboB9XT4exJ",
      sk: "edsk4AzUdwSFu383eMf8eve56Q2pJxy1eWt4BnzKkLKMdKurHgTeaf",
      pk: "edpku8MxEyEKHPsPeUBSBz5a5QbemdPbiQVsobdC3SnC9UDf4yMHTL",
  }
};

export const testnetKmsAccounts: Record<AccountName, IAccount> = {
  alice: {
    pkh: 'tz3RTjXZkXJw3TvNsnKVL478CWYYNjfMRTCZ',
    sk: '',
    pk: ''
  },
  bob: {
    pkh: 'tz3MY7GYiud8Y9YVk2MnbftrxYvZVBh4Rbkq',
    sk: '',
    pk: ''
  },
  eve: {
    pkh: 'tz3Z8wLvEiauxuw4QHR4sjWNbDugB68NX8px',
    sk: '',
    pk: ''
  },
  mallory: {
    pkh: 'tz3N8cUSMpM5zknEzT7EuUCUmqYrv2A8o36P',
    sk: '',
    pk: ''
  },
  oscar: {
    pkh: '',
    sk: '',
    pk: ''
  },
  trudy: {
    pkh: '',
    sk: '',
    pk: ''
  },
  isaac: {
    pkh: '',
    sk: '',
    pk: ''
  },
  david: {
    pkh: '',
    sk: '',
    pk: ''
  },
  susie: {
    pkh: '',
    sk: '',
    pk: ''
  },
  ivan: {
    pkh: '',
    sk: '',
    pk: ''
  }
};

export const accountPerNetwork: Record<NetworkName, Record<AccountName, IAccount>> = {
  development: accounts,
  mainnet: testnetAccounts,
  ghostnet: testnetAccounts,
  hangzhounet: testnetAccounts,
  ithacanet: testnetAccounts,
  'ithacanet-kms': testnetKmsAccounts,
  jakartanet: testnetAccounts,
  kathmandunet: testnetAccounts,
  limanet: testnetAccounts
};
