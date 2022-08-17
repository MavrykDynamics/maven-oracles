import { jest } from '@jest/globals';
import BigNumber from 'bignumber.js';
import { computeMedian, signData, verifyData } from '../helpers';

export const mockVerifyData = jest.fn<typeof verifyData>().mockResolvedValue(true);
export const mockComputeMedian = jest.fn<typeof computeMedian>().mockReturnValue(new BigNumber(123));

export const mockedSignature: Uint8Array = new Uint8Array([1, 2, 3, 4]);

export const mockSignData = jest.fn<typeof signData>().mockResolvedValue(mockedSignature);
