import { keys } from '@libp2p/crypto';

import BigNumber from 'bignumber.js';
import { IAttestedReport, IReport } from './reportgen.types.js';

export async function verifyData(
  publicKey: Uint8Array,
  msg: Uint8Array,
  signature: Uint8Array
): Promise<boolean> {
  const publKey = keys.unmarshalPublicKey(publicKey);
  return await publKey.verify(msg, signature);
}

export async function signData(privateKey: string, msg: Uint8Array): Promise<Uint8Array> {
  const privKey = await keys.unmarshalPrivateKey(new Buffer(privateKey, 'base64'));
  return await privKey.sign(msg);
}

export function computeMedian(report: IAttestedReport | IReport): BigNumber {
  // Copy the array so we do not mutate it with sort()
  const sortedObservation = [...report.observations].sort((a, b) => {
    return a.price.minus(b.price).toNumber();
  });

  const half = Math.floor(sortedObservation.length / 2);

  if (sortedObservation.length % 2) return sortedObservation[half].price;

  return sortedObservation[half - 1].price.plus(sortedObservation[half].price).dividedBy(2.0);
}
