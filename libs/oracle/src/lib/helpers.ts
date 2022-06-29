import {keys} from "@libp2p/crypto";

export async function signData (privateKey: string, msg: Uint8Array): Promise<Uint8Array> {
  const privKey = await keys.unmarshalPrivateKey(new Buffer(privateKey, 'base64'));
  return await privKey.sign(msg);
}

export async function verifyData (publicKey: Uint8Array, msg: Uint8Array, signature: Uint8Array): Promise<boolean> {
  const publKey = keys.unmarshalPublicKey(publicKey);
  return await publKey.verify(msg, signature);
}




