// eslint-disable-next-line @rushstack/no-new-null
export function filterNotNull<T>(ops: (T | null)[]): T[] {
  return ops.filter((op) => op !== null) as T[];
}
