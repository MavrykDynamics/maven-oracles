import { jest } from '@jest/globals';
import { InMemorySigner } from '@taquito/signer';
import { TezosToolkit } from '@taquito/taquito';
import { TxManagerService } from '@tezosdynamics/tx-manager';

export const mockaddBatch = jest.fn();

export const TxManagerServiceMock = jest.fn().mockImplementation((secretKey: string) => {
  const mockGetTezosToolkit = jest
  .fn<TxManagerService['getTezosToolkit']>()
  .mockImplementation(async () => {
    const tezos = await new TezosToolkit("rpc");
    tezos.setProvider({ signer: await InMemorySigner.fromSecretKey(secretKey) });
    return tezos;
  });
  return {
    addBatch: mockaddBatch,
    getTezosToolkit: mockGetTezosToolkit
  };
});
