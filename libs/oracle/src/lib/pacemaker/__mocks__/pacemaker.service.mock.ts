import { jest } from '@jest/globals';

export const mockInitialize = jest.fn();
export const PacemakerServiceMock = jest.fn().mockImplementation(() => {
  return { initialize: mockInitialize };
});
