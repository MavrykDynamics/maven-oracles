export const toTimestamp = (strDate: string): number => {
  const dt = Date.parse(strDate);
  return dt;
};
