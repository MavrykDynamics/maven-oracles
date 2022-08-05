import { jest } from '@jest/globals';

export const mockAddListener = jest.fn();
export const EventHubServiceMock = jest.fn().mockImplementation(() => {
  return { addListener: mockAddListener };
});
