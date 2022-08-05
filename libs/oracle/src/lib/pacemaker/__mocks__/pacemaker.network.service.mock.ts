import { jest } from '@jest/globals';

export const mockAddListener = jest.fn();
export const PacemakerNetworkServiceMock = jest.fn().mockImplementation(() => {
  return { addListener: mockAddListener };
});
