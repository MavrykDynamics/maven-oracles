import { jest } from '@jest/globals';
import { TypedEmitter } from 'tiny-typed-emitter';
import { IPacemakerEvents } from '../../pacemaker/index.js';
import { mockedOracleAddresses } from '../../contract/__mocks__/contract.service.mock.js';

export const PacemakerNetworkServiceEventEmitterMock = new TypedEmitter<IPacemakerEvents>();
export const mockAddListener = jest
  .fn()
  .mockImplementation(PacemakerNetworkServiceEventEmitterMock.addListener);

export const mockRemoveListener = jest
  .fn()
  .mockImplementation(PacemakerNetworkServiceEventEmitterMock.removeListener);

export const mockBroadcastObserveReq = jest.fn();
export const mockBroadcastReportReq = jest.fn();
export const mockBroadcastFinal = jest.fn();
export const mockBroadcastFinalEcho = jest.fn();
export const mockSendObserve = jest.fn();
export const mockGetPublicKeyOfPeerId = jest.fn().mockImplementation((peerIdString) => peerIdString);
export const mockSendReport = jest.fn();

export const ReportGenNetworkServiceMock = jest.fn().mockImplementation(() => {
  return {
    addListener: mockAddListener,
    removeListener: mockRemoveListener,
    broadcastObserveReq: mockBroadcastObserveReq,
    broadcastReportReq: mockBroadcastReportReq,
    broadcastFinal: mockBroadcastFinal,
    broadcastFinalEcho: mockBroadcastFinalEcho,
    sendObserve: mockSendObserve,
    getPublicKeyOfPeerId: mockGetPublicKeyOfPeerId,
    sendReport: mockSendReport
  };
});
