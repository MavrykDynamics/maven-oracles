import { expect, jest } from '@jest/globals';
import {
  ContractServiceMock,
  mockedOracleAddresses,
  mockGetAggregatorAddresses
} from '../../contract/__mocks__/contract.service.mock.js';
import { OracleConfigMock } from '../../__mocks__/oracle.config.mock.js';
import { IAggregatorInformations } from '@tezosdynamics/contracts';
import { mockInitialize, PacemakerServiceMock } from '../__mocks__/pacemaker.service.mock.js';
import { IPacemakerConfig } from '../pacemaker.config.js';
import { PacemakerNetworkService } from '../pacemaker.network.service.js';
import { PacemakerNetworkServiceMock } from '../__mocks__/pacemaker.network.service.mock.js';
import { ReportgenFactoryServiceMock } from '../../reportgen/__mocks__/reportgen.factory.service.mock.js';
import { EventHubService } from '../../event-hub/index.js';
import { ContractService } from '../../contract/index.js';
import { ReportGenFactoryService } from '../../reportgen/index.js';

jest.unstable_mockModule('../pacemaker.service.js', async () => ({
  PacemakerService: PacemakerServiceMock
}));

// Use async import to make sure we get the mocked one
const { PacemakerFactoryService } = await import('../pacemaker.factory.service.js');

describe('PacemakerFactoryService', () => {
  // @ts-expect-error
  let pacemakerFactory: PacemakerFactoryService;
  const pacemakerNetworkServiceMock = new PacemakerNetworkServiceMock();
  const eventHubServiceMock = new EventHubService();
  const reportGenFactoryMock = new ReportgenFactoryServiceMock();
  const contractServiceMock = new ContractServiceMock();

  beforeEach(async () => {
    pacemakerFactory = new PacemakerFactoryService(
      OracleConfigMock,
      pacemakerNetworkServiceMock as unknown as PacemakerNetworkService,
      eventHubServiceMock as unknown as EventHubService,
      contractServiceMock as unknown as ContractService,
      reportGenFactoryMock as unknown as ReportGenFactoryService
    );
  });

  describe('onModuleInit', () => {
    test('should read factory storage', async () => {
      await pacemakerFactory.onModuleInit();

      expect(mockGetAggregatorAddresses).toHaveBeenCalledTimes(1);
    });

    const zeroAggregator: IAggregatorInformations[] = [];
    const oneAggregator: IAggregatorInformations[] = [
      {
        pair: ['USD', 'ONE'],
        aggregatorAddress: 'USD-ONE/Address'
      }
    ];
    const twoAggregator: IAggregatorInformations[] = [
      {
        pair: ['USD', 'ONE'],
        aggregatorAddress: 'USD-ONE/Address'
      },
      {
        pair: ['USD', 'TWO'],
        aggregatorAddress: 'USD-TWO/Address'
      }
    ];

    test.each`
      storage           | n
      ${zeroAggregator} | ${0}
      ${oneAggregator}  | ${1}
      ${twoAggregator}  | ${2}
    `('should start $n Pacemaker services', async ({ storage, n }) => {
      mockGetAggregatorAddresses.mockReturnValue(storage);

      await pacemakerFactory.onModuleInit();

      expect(PacemakerServiceMock).toHaveBeenCalledTimes(n);
    });

    test('should provide correct pair name and address', async () => {
      mockGetAggregatorAddresses.mockReturnValue(oneAggregator);

      await pacemakerFactory.onModuleInit();

      const expectedConfig: IPacemakerConfig = {
        aggregatorAddress: 'USD-ONE/Address',
        aggregatorPair: ['USD', 'ONE'],
        timerProgressDurationMiliseconds: 30 * 1000,
        timerResendDurationMiliseconds: 15 * 1000,
        oracleAddresses: mockedOracleAddresses
      };

      expect(PacemakerServiceMock).toHaveBeenCalledWith(
        OracleConfigMock,
        pacemakerNetworkServiceMock,
        eventHubServiceMock,
        contractServiceMock,
        reportGenFactoryMock,
        expectedConfig
      );
    });

    test('should provide correct pair name and address for all aggregators', async () => {
      mockGetAggregatorAddresses.mockReturnValue(twoAggregator);

      await pacemakerFactory.onModuleInit();

      const expectedConfigOne: IPacemakerConfig = {
        aggregatorAddress: 'USD-ONE/Address',
        aggregatorPair: ['USD', 'ONE'],
        timerProgressDurationMiliseconds: 30 * 1000,
        timerResendDurationMiliseconds: 15 * 1000,
        oracleAddresses: mockedOracleAddresses
      };

      const expectedConfigTwo: IPacemakerConfig = {
        aggregatorAddress: 'USD-TWO/Address',
        aggregatorPair: ['USD', 'TWO'],
        timerProgressDurationMiliseconds: 30 * 1000,
        timerResendDurationMiliseconds: 15 * 1000,
        oracleAddresses: mockedOracleAddresses
      };

      expect(PacemakerServiceMock).toHaveBeenNthCalledWith(
        1,
        OracleConfigMock,
        pacemakerNetworkServiceMock,
        eventHubServiceMock,
        contractServiceMock,
        reportGenFactoryMock,
        expectedConfigOne
      );
      expect(PacemakerServiceMock).toHaveBeenNthCalledWith(
        2,
        OracleConfigMock,
        pacemakerNetworkServiceMock,
        eventHubServiceMock,
        contractServiceMock,
        reportGenFactoryMock,
        expectedConfigTwo
      );
    });

    test.each`
      storage           | n
      ${zeroAggregator} | ${0}
      ${oneAggregator}  | ${1}
      ${twoAggregator}  | ${2}
    `('should initialize pacemaker service with $n aggregators', async ({ storage, n }) => {
      mockGetAggregatorAddresses.mockReturnValue(storage);

      await pacemakerFactory.onModuleInit();

      expect(mockInitialize).toHaveBeenCalledTimes(n);
    });
  });
});
