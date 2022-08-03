import { Test } from '@nestjs/testing';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { PacemakerFactoryService } from '../pacemaker.factory.service';

const moduleMocker = new ModuleMocker(global);

describe('PacemakerFactoryService', () => {
  let controller: PacemakerFactoryService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PacemakerFactoryService]
    })
      .useMocker((token) => {
        // if (token === CatsService) {
        //   return { findAll: jest.fn().mockResolvedValue(results) };
        // }
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    controller = moduleRef.get(PacemakerFactoryService);
  });

  it('TODO: implem', () => {
    expect(true).toEqual(true);
  });
});
