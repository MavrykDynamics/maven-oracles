import { filterNotNull } from "../helpers";

it('filterNotNull', () => {
  const operations: (string | null)[] = [
    'operations1',
    'operations2',
    null,
    'operation4',
    null
  ]
  expect(operations.length).toEqual(5);
  const filteredOperations = filterNotNull(operations);
  expect(filteredOperations.length).toEqual(3);
});
