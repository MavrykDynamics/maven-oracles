import { jest } from '@jest/globals';
import { TypedEmitter } from 'tiny-typed-emitter';
import { IPacemakerEvents } from '../../pacemaker/index.js';

export const PacemakerNetworkServiceEventEmitterMock = new TypedEmitter<IPacemakerEvents>();
export const mockAddListener = jest
  .fn()
  .mockImplementation(PacemakerNetworkServiceEventEmitterMock.addListener);

export const mockRemoveListener = jest
  .fn()
  .mockImplementation(PacemakerNetworkServiceEventEmitterMock.removeListener);

export const mockBroadcastObserveReq = jest.fn();

export const ReportGenNetworkServiceMock = jest.fn().mockImplementation(() => {
  return {
    addListener: mockAddListener,
    removeListener: mockRemoveListener,
    broadcastObserveReq: mockBroadcastObserveReq
  };
});
