import { jest } from '@jest/globals';
import { TypedEmitter } from 'tiny-typed-emitter';
import { IPacemakerEvents } from '../pacemaker.types.js';

export const mockBroadcastNewEpoch = jest.fn();
export const PacemakerNetworkServiceEventEmitterMock = new TypedEmitter<IPacemakerEvents>();
export const mockAddListener = jest.fn().mockImplementation((...args) => {
  PacemakerNetworkServiceEventEmitterMock.addListener(...args);
});
export const mockRemoveListener = jest.fn().mockImplementation((...args) => {
  PacemakerNetworkServiceEventEmitterMock.removeListener(...args);
});

export const PacemakerNetworkServiceMock = jest.fn().mockImplementation(() => {
  return {
    addListener: mockAddListener,
    removeListener: mockRemoveListener,
    broadcastNewEpoch: mockBroadcastNewEpoch
  };
});
