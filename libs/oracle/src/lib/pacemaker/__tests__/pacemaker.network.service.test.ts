import { INewEpochMessage } from '../pacemaker.types.js';
import { PacemakerNetworkService } from '../pacemaker.network.service.js';
import { expect } from '@jest/globals';

describe('PacemakerNetworkService', () => {
  test('should correctly serialize and deserialize newEpoch messages', () => {
    const newEpochMessage: INewEpochMessage = {
      newEpoch: 12,
      aggregatorAddress: 'aggregatorAddress'
    };

    const sezialized = PacemakerNetworkService.serializeNewEpochMessage(newEpochMessage);
    const desezialized = PacemakerNetworkService.deserializeNewEpochMessage(sezialized);

    expect(newEpochMessage).toEqual(desezialized);
  });
});
