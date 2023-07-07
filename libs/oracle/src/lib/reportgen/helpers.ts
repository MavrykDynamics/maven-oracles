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
  const sortedObservation = [...report.observations].sort((a, b) => {
    return a.data.minus(b.data).toNumber();
  });

  const half = Math.floor(sortedObservation.length / 2);

  return (sortedObservation.length % 2) ? 
      sortedObservation[half].data : // if the length is even
      sortedObservation[half - 1].data.plus(sortedObservation[half].data).dividedBy(2.0); // if the length is odd
}
