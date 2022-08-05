export const computeFValueFrom = (nOracles: number): number => {
  return Math.floor((nOracles - 1) / 3);
};
