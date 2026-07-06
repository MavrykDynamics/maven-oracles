import { NetworkName } from './scripts/env.js';
import BigNumber from 'bignumber.js';
import { MichelsonMap, MichelsonMapKey } from '@mavrykdynamics/webmavryk-michelson-encoder';

const currentTimestamp: number = Math.round(new Date().getTime() / 1000);
export const satelliteLedger: MichelsonMap<MichelsonMapKey, unknown> = MichelsonMap.fromLiteral({
  mv1AAFByPGTyFdbshgfA8ogjgf7pQKuR7ATp: {
    status: "ACTIVE",
    stakedMvnBalance: new BigNumber(1000000000000),
    satelliteFee: new BigNumber(200),
    totalDelegatedAmount: new BigNumber(10000000000),
    name: "satelliteName",
    description: "satelliteDescription",
    image: "satelliteImage",
    website: "satelliteWebsite",
    registeredDateTime: currentTimestamp.toString(),  
    oraclePublicKey: "edpku9qEgcyfNNDK6EpMvu5SqXDqWRLuxdMxdyH12ivTUuB1KXfGP4",
    oraclePeerId: "12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1"
  },
  mv1B1CtqbiFwtWFkqrFbDAMRbDTofCSjHokn: {
    status: "ACTIVE",
    stakedMvnBalance: new BigNumber(1000000000000),
    satelliteFee: new BigNumber(200),
    totalDelegatedAmount: new BigNumber(10000000000),
    name: "satelliteName",
    description: "satelliteDescription",
    image: "satelliteImage",
    website: "satelliteWebsite",
    registeredDateTime: currentTimestamp.toString(), 
    oraclePublicKey: 'edpkv3sej4FWX2cUg8DR9F9QmsEb3YdodhDbVg1o1ooeWUDkuRGTsg',
    oraclePeerId: '12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2'
  },
  mv18PbrKkCWNMJdfgiWqeT9CZ41ugskLqAWb: {
    status: "ACTIVE",
    stakedMvnBalance: new BigNumber(1000000000000),
    satelliteFee: new BigNumber(200),
    totalDelegatedAmount: new BigNumber(10000000000),
    name: "satelliteName",
    description: "satelliteDescription",
    image: "satelliteImage",
    website: "satelliteWebsite",
    registeredDateTime: currentTimestamp.toString(), 
    oraclePublicKey: 'edpkuPANijWBa9ym9kyiJZw1vaJ5tgyB5i92NaBaqerboGYsAqKdQY',
    oraclePeerId: '12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3'
  },
  mv1PBrrrLGrp1oTnsoeTKtaSMNMmaosqhLgR: {
    status: "ACTIVE",
    stakedMvnBalance: new BigNumber(1000000000000),
    satelliteFee: new BigNumber(200),
    totalDelegatedAmount: new BigNumber(10000000000),
    name: "satelliteName",
    description: "satelliteDescription",
    image: "satelliteImage",
    website: "satelliteWebsite",
    registeredDateTime: currentTimestamp.toString(), 
    oraclePublicKey: 'edpkttTiMroeueToLvjEo7zQqeTDFNT5iq1gKrPwA2DMqjD5uMmxpp',
    oraclePeerId: '12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34'
  },
  mv1BDR7SeuTfJmP12mcpSXCEMCbVUotCcmM5: {
    status: "ACTIVE",
    stakedMvnBalance: new BigNumber(1000000000000),
    satelliteFee: new BigNumber(200),
    totalDelegatedAmount: new BigNumber(10000000000),
    name: "satelliteName",
    description: "satelliteDescription",
    image: "satelliteImage",
    website: "satelliteWebsite",
    registeredDateTime: currentTimestamp.toString(), 
    oraclePublicKey: 'edpku9xhspeP5aSSpSAA4aopgTH9pRjBMMoitoJN45bdye4RSGhFoF',
    oraclePeerId: '12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5'
  },
  mv1FmXyQkcfufUw9zwW3Dyg1W3JMHcDZ8rV5: {
    status: "ACTIVE",
    stakedMvnBalance: new BigNumber(1000000000000),
    satelliteFee: new BigNumber(200),
    totalDelegatedAmount: new BigNumber(10000000000),
    name: "satelliteName",
    description: "satelliteDescription",
    image: "satelliteImage",
    website: "satelliteWebsite",
    registeredDateTime: currentTimestamp.toString(), 
    oraclePublicKey: 'edpkv6xHMqShSMr4CK3Vzg7mD1hina7eBkokrMoKpuYj55BVd18rjN',
    oraclePeerId: '12D3KooWEKXXjviRoWwoB37UzBT4qjUBbQH8bypWy3YWmyfvR736'
  },
  mv1PkouN3EwYmnfjFk817r7mXzTmjY1r5M1e: {
    status: "ACTIVE",
    stakedMvnBalance: new BigNumber(1000000000000),
    satelliteFee: new BigNumber(200),
    totalDelegatedAmount: new BigNumber(10000000000),
    name: "satelliteName",
    description: "satelliteDescription",
    image: "satelliteImage",
    website: "satelliteWebsite",
    registeredDateTime: currentTimestamp.toString(), 
    oraclePublicKey: 'edpku8MxEyEKHPsPeUBSBz5a5QbemdPbiQVsobdC3SnC9UDf4yMHTL',
    oraclePeerId: '12D3KooWRGcN9uh633ucfUJ3XQ69n31mB2jPHKtrw7mfCSJdLz97'
  }
});

export const oracleLedger: MichelsonMap<MichelsonMapKey, unknown> = MichelsonMap.fromLiteral({
  mv1AAFByPGTyFdbshgfA8ogjgf7pQKuR7ATp: {
    // oracle1
    oraclePublicKey: 'edpku9qEgcyfNNDK6EpMvu5SqXDqWRLuxdMxdyH12ivTUuB1KXfGP4',
    oraclePeerId: '12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1'
  },
  mv1B1CtqbiFwtWFkqrFbDAMRbDTofCSjHokn: {
    // oracle2
    oraclePublicKey: 'edpkv3sej4FWX2cUg8DR9F9QmsEb3YdodhDbVg1o1ooeWUDkuRGTsg',
    oraclePeerId: '12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2'
  },
  mv18PbrKkCWNMJdfgiWqeT9CZ41ugskLqAWb: {
    // oracle3
    oraclePublicKey: 'edpkuPANijWBa9ym9kyiJZw1vaJ5tgyB5i92NaBaqerboGYsAqKdQY',
    oraclePeerId: '12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3'
  },
  mv1PBrrrLGrp1oTnsoeTKtaSMNMmaosqhLgR: {
    // oracle4
    oraclePublicKey: 'edpkttTiMroeueToLvjEo7zQqeTDFNT5iq1gKrPwA2DMqjD5uMmxpp',
    oraclePeerId: '12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34'
  },
  mv1BDR7SeuTfJmP12mcpSXCEMCbVUotCcmM5: {
    // oracle5
    oraclePublicKey: 'edpku9xhspeP5aSSpSAA4aopgTH9pRjBMMoitoJN45bdye4RSGhFoF',
    oraclePeerId: '12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5'
  },
  mv1FmXyQkcfufUw9zwW3Dyg1W3JMHcDZ8rV5: {
    // oracle6
    oraclePublicKey: 'edpkv6xHMqShSMr4CK3Vzg7mD1hina7eBkokrMoKpuYj55BVd18rjN',
    oraclePeerId: '12D3KooWEKXXjviRoWwoB37UzBT4qjUBbQH8bypWy3YWmyfvR736'
  },
  mv1PkouN3EwYmnfjFk817r7mXzTmjY1r5M1e: {
    // oracle7
    oraclePublicKey: 'edpku8MxEyEKHPsPeUBSBz5a5QbemdPbiQVsobdC3SnC9UDf4yMHTL',
    oraclePeerId: '12D3KooWRGcN9uh633ucfUJ3XQ69n31mB2jPHKtrw7mfCSJdLz97'
  }
});

export const heartbeatSeconds: BigNumber = new BigNumber(300);
export const alphaPercentPerThousand: BigNumber = new BigNumber(2);
export const percentOracleThreshold: BigNumber = new BigNumber(60);
export const rewardAmountStakedMvn: BigNumber = new BigNumber(10000000);
export const rewardAmountXtz: BigNumber = new BigNumber(1300);
export const decimals: BigNumber = new BigNumber(8);
export const zeroAddress: string = 'mv2ZZZZZZZZZZZZZZZZZZZZZZZZZZZDXMF2d';
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
    pkh: 'mv1Hox9jGJg3uSmsv9NTvuK7rMHh25cq44nv',
    sk: 'edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq',
    pk: 'edpkvGfYw3LyB1UcCahKQk4rF2tvbMUk8GFiTuMjL75uGXrpvKXhjn'
  },
  bob: {
    pkh: 'mv1NpEEq8FLgc2Yi4wNpEZ3pvc1kUZrp2JWU',
    sk: 'edsk3RFfvaFaxbHx8BMtEW1rKQcPtDML3LXjNqMNLCzC3wLC1bWbAt',
    pk: 'edpkurPsQ8eUApnLUJ9ZPDvu98E8VNj4KtJa1aZr16Cr5ow5VHKnz4'
  },
  eve: {
    pkh: 'mv1AAFByPGTyFdbshgfA8ogjgf7pQKuR7ATp',
    sk: 'edsk3Sb16jcx9KrgMDsbZDmKnuN11v4AbTtPBgBSBTqYftd8Cq3i1e',
    pk: 'edpku9qEgcyfNNDK6EpMvu5SqXDqWRLuxdMxdyH12ivTUuB1KXfGP4'
  },
  mallory: {
    pkh: 'mv1DQGgRUjgKcCLvvsk9qxQNPrN5iGeaPzYc',
    sk: 'edsk3W5Fz1yWK39sLY6vidmgkfmGAXh6V2JqUiri9W1pFeeYWbFbJL',
    pk: 'edpkujwsG5JMrWVXQwmRMBoR9yJkokRbn6wy3monpQKBpnZTs1ogRR'
  },
  oscar: {
    pkh: 'mv1HeTAK8WCunnbD2C64cwK2kp8cNo6TUmkj',
    sk: 'edsk3Wz91mGzhGcq2jVnbTnfkyY7Zod8gdQp2dHfnzud5gRAJ2uoaK',
    pk: 'edpkvJm4eyR4vL7cY3B8zRyFMAGE4W8AuDtjio6v1GSm7dgS79rL23'
  },
  trudy: {
    pkh: 'mv1B1CtqbiFwtWFkqrFbDAMRbDTofCSjHokn',
    sk: 'edsk3ZBmJ3e34AhZViEanGN87QvayUQupJ28Q89xUpFFSv18xF2Lqf',
    pk: 'edpkv3sej4FWX2cUg8DR9F9QmsEb3YdodhDbVg1o1ooeWUDkuRGTsg'
  },
  isaac: {
    pkh: 'mv1HDFxgWgjt32UeXGKhJyFDukD821CWNDN6',
    sk: 'edsk3ULsmx8aEogiMs2T4Td8rLzfvd6Vv8D5CJqeKQKrsjZHVqRDrX',
    pk: 'edpkuZxa3i78gthryUa1aqh5AwuCqqLG7P55Tsh79pZaSryxZzhCVZ'
  },
  david: {
    pkh: 'mv1T1xzZGCwyHSVQGChh5dokhQDPKekNfoHU',
    sk: 'edsk3S7NRL14arofJk4YESBzLaw9GMzweoVHSFsw4ycj7ya4BFgBp8',
    pk: 'edpkucHyjuibNhFC4ZMmidjurjr4BXPP95a9fLo1LTADvw3ztSp78p'
  },
  susie: {
    pkh: 'mv1QDxQdgCN8Uiiveo8CF8xbSUpxooBk3iGJ',
    sk: 'edsk3YkX5ZcHQEBkVcEhukt9WpTextmQiiY93zEaj27fD1p1pf2k17',
    pk: 'edpkv8C5fAVfNEEWZivnumqGKRGz2aK2uNVVw72JheSUHmXGEUKsh5'
  },
  ivan: {
    pkh: 'mv1P4Siz1TuQbXpYWSK2VUQfSgSo2r4TmT69',
    sk: 'edsk3UMB8zmwbiR1ynx4UZMQLukxkhv6PJTEv6H2cC2kj1m3NquTBB',
    pk: 'edpkukdsnybt7rMjmHp1t2eXX1iTdAFUmR5xUb9eqHsKLnk33UBaic'
  }
};

// mavkit-client import secret key alice-test unencrypted:edsk3Sb16jcx9KrgMDsbZDmKnuN11v4AbTtPBgBSBTqYftd8Cq3i1e  --force && mavkit-client show address alice-test
// mavkit-client import secret key alice-test unencrypted:edskRpPWgoNUfJgZRiycPg9539KMX6Ksw5yNVDw2ukds8VEgqXLLuBDrB6dr6m7fgsAZrLMDpPkxN7kRpcNyRzwkPYhoWsBJsZ  --force && mavkit-client show address alice-test
// mavkit-client import secret key alice-test unencrypted:edsk3Kny3RjsnGRi4cZ8hfm4MraAv7KZWRuKYHNPoBWw3TvfKbXQaU  --force && mavkit-client show address alice-test
// mavkit-client import secret key alice-test unencrypted:edsk3ZeMrkM5j3aCpfVU2N3ivtyxDuanzuRzhBWdzBBTuk2Yfdnddr  --force && mavkit-client show address alice-test
// mavkit-client import secret key alice-test unencrypted:edsk3RcKtYv9XxbfbYJj7uZw75ffewdQJTXFYweve9nkHgG6cJfEL9  --force && mavkit-client show address alice-test

export const testnetAccounts: Record<AccountName, IAccount> = {
  alice: {
      pkh: "mv1E2Y8khTrfaRUeErWUBfg6G7zNMKnM4JJL",
      sk: "edskS5Xd6CDBLbuJwkaa7mT2K6mom4odhbBiS3bxDtAB1crXWj4gwKF5oQsN9aijR3CNpr7cZXxcoUU32vqm67W3MRGSTVzMmz",
      pk: "edpku8CdxqUzHhL8X3fgpCX5CfmqxUU7JWBTmXwqUATt78dGijvqWd",
  },
  bob: {
      pkh: "mv1TMgthRwT69X8WMqRyeMYLPEcoEfCKqX2w",
      sk: "edskSA1MhTp6Eq3T79MEP822eXAmxXBk89eFYGgwBsJjfyUHDGsYfudasQocwcb5DUEMvA1B3EsvxCZ8G6Wek6syxAA49DEKzq",
      pk: "edpktqePwpgrWGS49FiAMDacb3bLiDLE8BrbLoi6zYdcZ9bttDLo1D",
  },
  eve: {
      pkh: "mv1Q3DyGiVYDrRj5PrUVQkTA1LHwYy8gHwQV",
      sk: "edskRvgMBH37Dci9isEHcdsHQ4ioPdUq3AfXDiAj3ZXiuy3YMs4LEUiZVMaSG9KjTFo78LidgZkdVbkXUamMK2or8UAxB743SH",
      pk: "edpkv758sKsFGRwE3ZNDR1wdVEnxZui344fsxEtCKbpNMcTaQw2Yis",
  },
  mallory: {
      pkh: "mv1Ffw8ejzFRH6zBtbMdB87qzf5MZBhr8e3L",
      sk: "edsk3bVbowf9hFpdk8mAjZ8qSKzRTcFTgfqdoY4txdQrUhGHJGruXB",
      pk: "edpkv6mD1SBoUB45g6Ss3LYfYzqZGxRfA3dehYBxEvGidFzsCg6yXQ",
  },
  oscar: {
      pkh: "mv1N49LWf2GtvDBS2XGNZZEEKY4QNKxQjV4B",
      sk: "edsk32TqRuUFWHE6jwrPgbk5M9A3Sbs4shY4dh1WJCMR1fJjoV6iNs",
      pk: "edpkuTgScYTtrvAtTU6UMF44NvNd51ah1aqNeerNFC38bGZrKVXwFP",
  },
  trudy: {
      pkh: "mv1RmqZpXm6wQ45oTLMNKRVWSZBbCHN98bGe",
      sk: "edsk3AbmsisVnZtkyVvY1jkyNpSTcRhW3hepihBLTu6e5sUaTS2x1c",
      pk: "edpkubMsp1wdfpARu3ZsHKwrtkR9PQiAN8nsACP2hiksb7oM5aUhpu",
  },
  isaac: {
      pkh: "mv1Eb9L6u4MHkZ3ALdeXnJmAACZntu4R524m",
      sk: "edsk3ahGaSWjzjHuS7mK5Bsy7LxH8iTRXpGcMvzjgSypKHKw2wrq1u",
      pk: "edpktpYJesCTU55qxTy2RjdBUupRzVUM3Ek4VzVFxZjypLXPJSaTdn",
  },
  david: {
      pkh: "mv1BkoZCjLwyH9wzHqzQkFUNPYA6wFzXKjTR",
      sk: "edsk3hwth6tL9hppsUT6sZQ5687DDY9GPgKiZgjg9DDcMjJxoRUsGc",
      pk: "edpkvK4zfvkuzHmbh2CofrBmQ52jrk3b23puVdJkTJCFmHZTLapSWB",
  },
  susie: {
      pkh: "mv1FmXyQkcfufUw9zwW3Dyg1W3JMHcDZ8rV5",
      sk: "edsk2vtJ2rVoHoA3GbgDjyT5zbeVMDXZ6R4YjDskKaapgsRtiEWpaP",
      pk: "edpkv6xHMqShSMr4CK3Vzg7mD1hina7eBkokrMoKpuYj55BVd18rjN",
  },
  ivan: {
      pkh: "mv1PkouN3EwYmnfjFk817r7mXzTmjY1r5M1e",
      sk: "edsk4AzUdwSFu383eMf8eve56Q2pJxy1eWt4BnzKkLKMdKurHgTeaf",
      pk: "edpku8MxEyEKHPsPeUBSBz5a5QbemdPbiQVsobdC3SnC9UDf4yMHTL",
  }
};

export const testnetKmsAccounts: Record<AccountName, IAccount> = {
  alice: {
    pkh: 'mv3FZ47oBnqTg6t7YdgjparXDBUSqH8S82nU',
    sk: '',
    pk: ''
  },
  bob: {
    pkh: 'mv3MMS8XYGBAwno76pL275rdZresXMUcPGDG',
    sk: '',
    pk: ''
  },
  eve: {
    pkh: 'mv3Q1PdPYyyboATyKdwCBJ98zEG4P1DTm7gB',
    sk: '',
    pk: ''
  },
  mallory: {
    pkh: 'mv3Ck5MokZW5NqjbDQxioP5jS3cgyEbL63h2',
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
  basenet: testnetAccounts,
  basenet: testnetAccounts
};