import { toTimestamp } from '../helpers';

it('toTimestamp', () => {
  const dateString: string = '2022-09-15T12:22:25Z';
  const timestamp: number = toTimestamp(dateString);
  expect(timestamp).toEqual(1663244545000);
});
