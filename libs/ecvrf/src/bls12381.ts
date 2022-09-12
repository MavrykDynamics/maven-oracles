import { pairing, PointG1, PointG2, Fp12, Fr, CURVE } from '@noble/bls12-381';

export const ECVRF_prove = async (
  SK: string,
  messageHex: string
): Promise<{
  output: Fp12;
  proof: PointG2;
}> => {
  const secretKey = BigInt(`0x${SK}`); // SK
  const message = BigInt(messageHex); // x

  const G1G2Pairing = pairing(PointG1.BASE, PointG2.BASE, false);

  const XPlusS = secretKey + message; // x + s
  const OneOverXPlusS = new Fr(XPlusS).invert().value;

  const output = G1G2Pairing.pow(OneOverXPlusS).finalExponentiate();
  const proof = PointG2.BASE.multiply(OneOverXPlusS);

  return {
    output,
    proof
  };
};

export const ECVRF_verify = async (
  PK: Uint8Array,
  output: Fp12,
  proof: PointG2,
  messageHex: string
): Promise<boolean> => {
  const outputPrime = pairing(PointG1.BASE, proof);

  if (!outputPrime.equals(output)) {
    console.log('output != e(g, proof)');
    return false;
  }

  const message = BigInt(messageHex); // x
  const left = pairing(PointG1.BASE.multiply(message).add(PointG1.fromHex(PK)), proof);
  const right = pairing(PointG1.BASE, PointG2.BASE.negate());

  if (!left.multiply(right).equals(Fp12.ONE)) {
    console.log('e(x.G + s.G, proof) != e(G, G)');
    return false;
  }

  return true;
};

// Fp12(
//  Fp6(
//    Fp2(0b.d7 + 03.a9×i)
//    +
//    Fp2(03.a9 + 02.51×i
//  ) * v
//  ,
//  Fp2(10.d1 + 0f.55×i) * v^2) + Fp6(Fp2(09.5c + 03.85×i) + Fp2(0f.e4 + 11.8b×i) * v,
// Fp2(02.62 + 13.4d×i) * v^2) * w)

// R 52435875175126190479447740508185965837690552500527637822603658699938581184513
//   2393151656860616854354556983713347418825696687261783829843845241887838632133802032156852359509180886213364637507149
