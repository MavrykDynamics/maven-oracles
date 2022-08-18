import { jest } from '@jest/globals';
import BigNumber from 'bignumber.js';

export const mockRandomPermutation = jest.fn().mockReturnValue([
    'oracle1',
    'oracle2',
    'oracle3',
    'oracle4',
    'oracle5',
    'oracle6',
    'oracle7'
]);