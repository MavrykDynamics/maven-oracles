import { keys } from '@libp2p/crypto';
import { IAttestedReport, IReport } from './reportgen.network.service.js';
import BigNumber from 'bignumber.js';

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
  report.observations.sort((a, b) => {
    return a.price.minus(b.price).toNumber();
  });
  const half = Math.floor(report.observations.length / 2);

  if (report.observations.length % 2) return report.observations[half].price;

  return report.observations[half - 1].price.plus(report.observations[half].price).dividedBy(2.0);
}