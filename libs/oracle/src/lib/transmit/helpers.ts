import seedrandom from 'seedrandom';

/**
 * The randomPermutation function takes an array of type T and a seed phrase. 
 * It make a permutation via a PRNG algorythm and send back an array of type T "sorted"
 */

export function randomPermutation<T>(array: T[], seed: string): T[] {
  // alea is a PRNG (Pseudo Random Number Generator) of the seedrandom library
  const rnd = seedrandom.alea(seed);

  for (let i = array.length - 1; i > 0; i--) {
    const v = rnd();
    const j = Math.floor(v * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
