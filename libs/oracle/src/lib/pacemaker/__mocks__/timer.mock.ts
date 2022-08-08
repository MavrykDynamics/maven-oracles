import { jest } from '@jest/globals';

export const TimerMock = jest.fn().mockImplementation((callback: () => void, timeMs: number) => {
  const mockStop = jest.fn();
  const mockRestart = jest.fn();

  return {
    stop: mockStop,
    restart: mockRestart,
    fakeTimeout: async () => {
      await callback();
    },
    timeMs
  };
});
