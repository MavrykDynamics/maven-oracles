import { jest } from '@jest/globals';
import { IAttestedReport } from 'src/lib/reportgen';

export const mockedEmptyAttestedRepport: IAttestedReport = {
  epoch: 3,
  round: 0,
  observations: [],
  signatures: [],
};

export const mockInitialize = jest.fn();
export const TransmitServiceMock = jest.fn().mockImplementation(() => {
  return { 
    initialize: mockInitialize 
  };
});
