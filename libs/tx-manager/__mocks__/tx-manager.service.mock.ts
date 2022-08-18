import { jest } from '@jest/globals';
import { TezosToolkit } from '@taquito/taquito';
import { TxManagerService } from '@tezosdynamics/tx-manager';

export const mockedTezosToolkit = new TezosToolkit('rpc');
export const mockaddBatch = jest.fn();
export const mockGetTezosToolkit = jest
  .fn<TxManagerService['getTezosToolkit']>()
  .mockResolvedValue(mockedTezosToolkit);
export const TxManagerServiceMock = jest.fn().mockImplementation(() => {
  return {
    addBatch: mockaddBatch,
    getTezosToolkit: mockGetTezosToolkit
  };
});
