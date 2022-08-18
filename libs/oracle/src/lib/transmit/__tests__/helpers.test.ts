import { mockedOracleAddresses } from "../../contract/__mocks__/contract.service.mock";
import { randomPermutation } from "../helpers";

const aggregatorAddress = 'aggregatorAddress';
const epoch = 1;
let round = 1;
let seed = `${aggregatorAddress}-${epoch}-${round}`;

it('Helper', () => {
  const permuted1 = randomPermutation(
    mockedOracleAddresses.map((addrs) => addrs.oracleAddress),
    seed
  );
  expect(permuted1).toEqual([
    'oracle3/address',
    'oracle6/address',
    'oracle2/address',
    'oracle7/address',
    'oracle1/address',
    'oracle5/address',
    'oracle4/address'
  ]);

  // increase round to change permutation
  round = 2;
  seed = `${aggregatorAddress}-${epoch}-${round}`;
  const permuted2 = randomPermutation(
    mockedOracleAddresses.map((addrs) => addrs.oracleAddress),
    seed
  );
  expect(permuted2).toEqual([
      'oracle4/address',
      'oracle2/address',
      'oracle3/address',
      'oracle5/address',
      'oracle1/address',
      'oracle6/address',
      'oracle7/address'
    ]);
});
