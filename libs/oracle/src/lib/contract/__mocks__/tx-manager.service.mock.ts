import { jest } from '@jest/globals';
import { InMemorySigner } from '@mavrykdynamics/webmavryk-signer';
import { MavrykToolkit } from '@mavrykdynamics/webmavryk';
import { TxManagerService } from '@mavrykdynamics/tx-manager';

export const mockaddBatch = jest.fn();

export const TxManagerServiceMock = jest.fn().mockImplementation((secretKey: string) => {
  const mockGetMavrykToolkit = jest
  .fn<TxManagerService['getMavrykToolkit']>()
  .mockImplementation(async () => {
    const mavryk = await new MavrykToolkit("rpc");
    mavryk.setProvider({ signer: await InMemorySigner.fromSecretKey(secretKey) });
    return mavryk;
  });
  return {
    addBatch: mockaddBatch,
    getMavrykToolkit: mockGetMavrykToolkit
  };
});
