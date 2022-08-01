import seedrandom from 'seedrandom';

export function randomPermutation<T>(array: T[], seed: string): T[] {
  const rnd = seedrandom.alea(seed);

  for (let i = array.length - 1; i > 0; i--) {
    const v = rnd();
    const j = Math.floor(v * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
