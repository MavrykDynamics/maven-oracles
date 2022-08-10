import { jest } from '@jest/globals';

export const mockStop = jest.fn();
export const ReportGenLeaderServiceMock = jest.fn().mockImplementation(() => {
  return { stop: mockStop };
});
