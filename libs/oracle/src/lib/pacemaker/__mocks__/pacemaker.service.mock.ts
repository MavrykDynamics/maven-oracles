import { jest } from '@jest/globals';

export const mockInitialize = jest.fn();
const PacemakerServiceMock = jest.fn().mockImplementation(() => {
  return { initialize: mockInitialize };
});

export { PacemakerServiceMock };
