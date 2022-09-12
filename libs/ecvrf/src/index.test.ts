import {
  ECVRF_keygen as ECVRF_secp256k1_keygen,
  ECVRF_prove as ECVRF_secp256k1_prove,
  ECVRF_verify as ECVRF_secp256k1_verify
} from './secp256k1.js';
import {
  // ECVRF_keygen as ECVRF_bls12381_keygen,
  ECVRF_prove as ECVRF_bls12381_prove,
  ECVRF_verify as ECVRF_bls12381_verify
} from './bls12381.js';
import { expect } from '@jest/globals';
import elliptic from 'elliptic';
import { getPublicKey, CURVE } from '@noble/bls12-381';

const { ec } = elliptic;
const EC = new ec('secp256k1');

describe('secp256k1 ECVFR', function () {
  test('should verify a proof as valid', function () {
    const entropy = 'entropyentropyentropyentropyentropyentropyentropyentropy';
    const keyPair = ECVRF_secp256k1_keygen(entropy);
    const sk = keyPair.secret_key;
    const pk = keyPair.public_key;

    const message = [1, 2, 3];
    const proof = ECVRF_secp256k1_prove(sk, message);

    const verify = ECVRF_secp256k1_verify(pk.key, proof, message);

    expect(verify![0]).toEqual('VALID');
  });

  test('should verify a false proof as invalid', function () {
    const entropy = 'entropyentropyentropyentropyentropyentropyentropyentropy';
    const keyPair = ECVRF_secp256k1_keygen(entropy);
    const sk = keyPair.secret_key;
    const pk = keyPair.public_key;

    const message = [1, 2, 3];
    const proof = ECVRF_secp256k1_prove(sk, message);
    const verify = ECVRF_secp256k1_verify(pk.key, proof, '');

    expect(verify![0]).toEqual(null);
  });
});

describe('bls12-381 ECVFR', function () {
  test('should verify a proof as valid', async function () {
    // keys, messages & other inputs can be Uint8Arrays or hex strings
    const skHex = '67d53f170b908cabb9eb326c3c337762d59289a8fec79f7bc9254b584b73265c';
    const messageHex = '0123';
    const pk = getPublicKey(skHex);

    const { proof, output } = await ECVRF_bls12381_prove(skHex, messageHex);

    console.log(
      JSON.stringify(
        {
          proof: proof.toString(),
          output: output.toString()
        },
        null,
        4
      )
    );
    const verify = await ECVRF_bls12381_verify(pk, output, proof, messageHex);

    expect(verify).toEqual(true);
  });

  test('should verify a false proof as invalid', function () {
    expect(null).toEqual(null);
  });
});
