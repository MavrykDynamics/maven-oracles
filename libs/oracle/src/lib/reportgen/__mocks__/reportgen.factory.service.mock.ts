import { jest } from '@jest/globals';
import { MichelsonMap } from '@mavrykdynamics/taquito';

export const mockInitialize = jest.fn();
export const mockGetAggregatorFactoryStorage = jest.fn().mockReturnValue(new MichelsonMap());
export const mockStartReportGen = jest.fn();
export const mockStopReportGen = jest.fn();

export const ReportgenFactoryServiceMock = jest.fn().mockImplementation(() => {
  return {
    initialize: mockInitialize,
    startReportGen: mockStartReportGen,
    stopReportGen: mockStopReportGen
  };
});
