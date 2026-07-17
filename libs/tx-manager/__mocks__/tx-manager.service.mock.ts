import { jest } from '@jest/globals';
import { MavrykToolkit } from '@mavrykdynamics/webmavryk';
import { TxManagerService } from '@mavrykdynamics/tx-manager';

export const mockedMavrykToolkit = new MavrykToolkit('rpc');
export const mockaddBatch = jest.fn();
export const mockGetMavrykToolkit = jest
  .fn<TxManagerService['getMavrykToolkit']>()
  .mockResolvedValue(mockedMavrykToolkit);
export const TxManagerServiceMock = jest.fn().mockImplementation(() => {
  return {
    addBatch: mockaddBatch,
    getMavrykToolkit: mockGetMavrykToolkit
  };
});
