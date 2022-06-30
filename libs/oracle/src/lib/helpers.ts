import {keys} from "@libp2p/crypto";

export async function signData (privateKey: string, msg: Uint8Array): Promise<Uint8Array> {
  const privKey = await keys.unmarshalPrivateKey(new Buffer(privateKey, 'base64'));
  return await privKey.sign(msg);
}

export async function verifyData (publicKey: Uint8Array, msg: Uint8Array, signature: Uint8Array): Promise<boolean> {
  const publKey = keys.unmarshalPublicKey(publicKey);
  return await publKey.verify(msg, signature);
}

// TODO: put the map peerId -> tezos PK in the contract
export const accounts: any = [
  {
    pkh: 'tz1eAoFgsys8PhTUvT3V3eq2BFaZp8UsGNsr',
    sk: 'edskRkawwQimT7qNaw4g99dKh3ExUt3corurNLUwvYo2vwwAGdy6NK4At1QLEy9Km24TuwCFfr5k97wvDxKBn5iQqTxdvvpdjt',
    pk: 'edpkv9DgHWm6HY6b35Mv77hgZcWrJVD4ADebp9RjYxXVmFvGs4VYi1',
  },
  {
      pkh: 'tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm',
      sk: 'edskRpPWgoNUfJgZRiycPg9539KMX6Ksw5yNVDw2ukds8VEgqXLLuBDrB6dr6m7fgsAZrLMDpPkxN7kRpcNyRzwkPYhoWsBJsZ',
      pk: 'edpkunKYLbEfRLKLtn9yi9avyjQbAAbQxuPVN759ajQEDKpp4RE6GV',
  },
  {
      pkh: 'tz1PSmvRd3ySbh5aviFEMYGD6542LL5QnrMk',
      sk: 'edskRzrnZoreVanzsedvSDgWV1DkNycfjMXyri9LQLVYdXTXJrxNHzdtpouGJTQ1CrQiWK6ECvHCpoYfQ2LM7j8GjJdkjqrsLE',
      pk: 'edpkuVjyKad7yCnNrCbGea7hi5Zh1zp5Cb1TvxUmnxC33fwKhq7daN',
  },
  {
      pkh: 'tz1KrELvNVY4xKnujkXwrVLWuzWJEg9FvA8v',
      sk: 'edskRjjhoUjvSZ2eGgGpvcMk6SrtpajjkzGUXDpr2EAa25VTfdtNSoD1JLhEoEnotYR6ZtRC2bCk56kwf79eqgygrMeR145ENq',
      pk: 'edpku7vkvS6XaWzFjmPDYULNyYrS7Rf1vHuoQ9FD8zVcaFNJ51bJ82',
  },
  {
      pkh: 'tz1YKquTvvSE2B5kvGyf1AYeXD6b6cMDSzDe',
      sk: 'edskRts3yovQnSAaK6WbyiaZdBnLk1cSeq8UEWo24xNyo1T6gZZ9yQpQ48YmvCwjjW1FpSgJ1LPZ9T3jazmh3HXLLKHDaJZVx2',
      pk: 'edpkuqoXhgeXYZxn6yVWuy9UrWKazyahPaAbwnuZYknRefeLVVK3ar',
  },
  {
      pkh: 'tz1TQ4fpSFNZ6D9vrcwBz9yzM2SNjDj5YoU7',
      sk: 'edsk2vtJ2rVoHoA3GbgDjyT5zbeVMDXZ6R4YjDskKaapgsRtiEWpaP',
      pk: 'edpkv6xHMqShSMr4CK3Vzg7mD1hina7eBkokrMoKpuYj55BVd18rjN',
  },
  {
      pkh: 'tz1bPLbmiseCCWtW7RZ9t2RkNyboB9XT4exJ',
      sk: 'edsk4AzUdwSFu383eMf8eve56Q2pJxy1eWt4BnzKkLKMdKurHgTeaf',
      pk: 'edpku8MxEyEKHPsPeUBSBz5a5QbemdPbiQVsobdC3SnC9UDf4yMHTL',
  }
];

export const mapPeerIDPublicKey: { peerId: string; publicKey: string; }[] = [
  {
    peerId: "12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1",
    publicKey: "edpkv9DgHWm6HY6b35Mv77hgZcWrJVD4ADebp9RjYxXVmFvGs4VYi1"
  },
  {
    peerId: "12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2",
    publicKey: "edpkunKYLbEfRLKLtn9yi9avyjQbAAbQxuPVN759ajQEDKpp4RE6GV"
  },
  {
    peerId: "12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3",
    publicKey: "edpkuVjyKad7yCnNrCbGea7hi5Zh1zp5Cb1TvxUmnxC33fwKhq7daN"
  },
  {
    peerId: "12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34",
    publicKey: "edpku7vkvS6XaWzFjmPDYULNyYrS7Rf1vHuoQ9FD8zVcaFNJ51bJ82"
  },
  {
    peerId: "12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5",
    publicKey: "edpkuqoXhgeXYZxn6yVWuy9UrWKazyahPaAbwnuZYknRefeLVVK3ar"
  },
  {
    peerId: "12D3KooWEKXXjviRoWwoB37UzBT4qjUBbQH8bypWy3YWmyfvR736",
    publicKey: ""
  },
  {
    peerId: "12D3KooWRGcN9uh633ucfUJ3XQ69n31mB2jPHKtrw7mfCSJdLz97",
    publicKey: ""
  },
]




