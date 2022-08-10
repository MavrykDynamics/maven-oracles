import { jest } from '@jest/globals';

export const mockStop = jest.fn();
export const ReportGenFollowerServiceMock = jest.fn().mockImplementation(() => {
  return { stop: mockStop };
});
