import { expect, jest } from '@jest/globals';
import {
  ContractServiceMock,
  mockGetAggregatorFactoryStorage
} from '../../contract/__mocks__/contract.service.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import { MichelsonMap } from '@taquito/taquito';
import { IAggregatorFactoryStorage } from '@tezosdynamics/contracts';
// Import this named export into your test file:

import { mockInitialize, PacemakerServiceMock } from '../__mocks__/pacemaker.service.mock.js';
import { IPacemakerConfig } from '../pacemaker.config.js';

jest.unstable_mockModule('../pacemaker.service.js', async () => ({
  PacemakerService: PacemakerServiceMock
}));

// Use async import to make sure we get the mocked one
const { PacemakerFactoryService } = await import('../pacemaker.factory.service.js');

describe('PacemakerFactoryService', () => {
  // @ts-ignore
  let pacemakerFactory: PacemakerFactoryService;

  beforeEach(async () => {
    pacemakerFactory = new PacemakerFactoryService(
      OracleConfigMock,
      null,
      null,
      new ContractServiceMock(),
      null
    );
  });

  describe('onModuleInit', () => {
    test('should read factory storage', async () => {
      await pacemakerFactory.onModuleInit();

      expect(mockGetAggregatorFactoryStorage).toHaveBeenCalledTimes(1);
    });

    const zeroAggregator: IAggregatorFactoryStorage = new MichelsonMap();
    const oneAggregator: IAggregatorFactoryStorage = new MichelsonMap();
    oneAggregator.set(['USD', 'ONE'], 'USD-ONE/Address');
    const twoAggregator: IAggregatorFactoryStorage = new MichelsonMap();
    twoAggregator.set(['USD', 'ONE'], 'USD-ONE/Address');
    twoAggregator.set(['USD', 'TWO'], 'USD-TWO/Address');

    test.each`
      storage           | n
      ${zeroAggregator} | ${0}
      ${oneAggregator}  | ${1}
      ${twoAggregator}  | ${2}
    `('should start $n Pacemaker services', async ({ storage, n }) => {
      mockGetAggregatorFactoryStorage.mockReturnValue(storage);

      await pacemakerFactory.onModuleInit();

      expect(PacemakerServiceMock).toHaveBeenCalledTimes(n);
    });

    test('should provide correct pair name and address', async () => {
      mockGetAggregatorFactoryStorage.mockReturnValue(oneAggregator);

      await pacemakerFactory.onModuleInit();

      const expectedConfig: IPacemakerConfig = {
        aggregatorAddress: 'USD-ONE/Address',
        aggregatorPair: ['USD', 'ONE']
      };

      expect(PacemakerServiceMock).toHaveBeenCalledWith(
        OracleConfigMock,
        null,
        null,
        expect.anything(),
        null,
        expectedConfig
      );
    });

    test('should provide correct pair name and address for all aggregators', async () => {
      mockGetAggregatorFactoryStorage.mockReturnValue(twoAggregator);

      await pacemakerFactory.onModuleInit();

      const expectedConfigOne: IPacemakerConfig = {
        aggregatorAddress: 'USD-ONE/Address',
        aggregatorPair: ['USD', 'ONE']
      };

      const expectedConfigTwo: IPacemakerConfig = {
        aggregatorAddress: 'USD-TWO/Address',
        aggregatorPair: ['USD', 'TWO']
      };

      expect(PacemakerServiceMock).toHaveBeenNthCalledWith(
        1,
        OracleConfigMock,
        null,
        null,
        expect.anything(),
        null,
        expectedConfigOne
      );
      expect(PacemakerServiceMock).toHaveBeenNthCalledWith(
        2,
        OracleConfigMock,
        null,
        null,
        expect.anything(),
        null,
        expectedConfigTwo
      );
    });

    test.each`
      storage           | n
      ${zeroAggregator} | ${0}
      ${oneAggregator}  | ${1}
      ${twoAggregator}  | ${2}
    `('should initialize pacemaker service with $n aggregators', async ({ storage, n }) => {
      mockGetAggregatorFactoryStorage.mockReturnValue(storage);

      await pacemakerFactory.onModuleInit();

      expect(mockInitialize).toHaveBeenCalledTimes(n);
    });
  });
});
