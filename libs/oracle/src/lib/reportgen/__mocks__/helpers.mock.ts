import { jest } from '@jest/globals';
import BigNumber from 'bignumber.js';

export const mockVerifyData = jest.fn().mockReturnValue(true);
export const mockComputeMedian = jest.fn().mockReturnValue(new BigNumber(123));

export const mockedSignature: Uint8Array = new Uint8Array([1, 2, 3, 4]);

export const mockSignData = jest.fn().mockResolvedValue(mockedSignature);
