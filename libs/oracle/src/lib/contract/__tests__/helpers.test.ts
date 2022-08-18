import { toTimestamp } from "../helpers";

it('toTimestamp', () => {
  const dateString: string = "Thu Aug 18 2022 10:40:10";
  const timestamp: number = toTimestamp(dateString);
  expect(timestamp).toEqual(1660812010000);
});
