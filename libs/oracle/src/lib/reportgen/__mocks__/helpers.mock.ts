import { jest } from '@jest/globals';
import BigNumber from 'bignumber.js';

export const mockVerifyData = jest.fn().mockReturnValue(true);
export const mockComputeMedian = jest.fn().mockReturnValue(new BigNumber(123));
export const mockSignData = jest.fn();
