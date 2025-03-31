import { jest } from '@jest/globals';
import { InMemorySigner } from '@mavrykdynamics/taquito-signer';
import { TezosToolkit } from '@mavrykdynamics/taquito';
import { TxManagerService } from '@mavrykdynamics/tx-manager';

export const mockaddBatch = jest.fn();

export const TxManagerServiceMock = jest.fn().mockImplementation((secretKey: string) => {
  const mockGetTezosToolkit = jest
  .fn<TxManagerService['getTezosToolkit']>()
  .mockImplementation(async () => {
    const mavryk = await new TezosToolkit("rpc");
    mavryk.setProvider({ signer: await InMemorySigner.fromSecretKey(secretKey) });
    return mavryk;
  });
  return {
    addBatch: mockaddBatch,
    getTezosToolkit: mockGetTezosToolkit
  };
});
