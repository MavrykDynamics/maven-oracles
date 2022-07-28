/* eslint-disable @rushstack/no-new-null */

import { keys } from '@libp2p/crypto';
import { IAttestedReport, IReport } from './reportgen/reportgen.network.service.js';
import BigNumber from 'bignumber.js';
import seedrandom from 'seedrandom';

export async function signData(privateKey: string, msg: Uint8Array): Promise<Uint8Array> {
  const privKey = await keys.unmarshalPrivateKey(new Buffer(privateKey, 'base64'));
  return await privKey.sign(msg);
}

export async function verifyData(
  publicKey: Uint8Array,
  msg: Uint8Array,
  signature: Uint8Array
): Promise<boolean> {
  const publKey = keys.unmarshalPublicKey(publicKey);
  return await publKey.verify(msg, signature);
}

export function filterNotNull<T>(ops: (T | null)[]): T[] {
  return ops.filter((op) => op !== null) as T[];
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

export function randomPermutation<T>(array: T[], seed: string): T[] {
  const rnd = seedrandom.alea(seed);

  for (let i = array.length - 1; i > 0; i--) {
    const v = rnd();
    const j = Math.floor(v * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

export const toTimestamp = (strDate: string): number => {
  const dt = Date.parse(strDate);
  return dt;
};
