/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @rushstack/no-new-null */
import { networkConfig } from './env.js';

import { BlockResponse, OperationEntry } from '@mavrykdynamics/webmavryk-rpc';
import { MavrykToolkit } from '@mavrykdynamics/webmavryk';

export const SYNC_INTERVAL: number = networkConfig.syncInterval;
export const CONFIRM_TIMEOUT: number = networkConfig.confirmTimeout;

export interface IConfirmOperationOptions {
  initializedAt?: number;
  fromBlockLevel?: number;
  signal?: AbortSignal;
}

export async function confirmOperation(
  mavryk: MavrykToolkit,
  opHash: string,
  { initializedAt, fromBlockLevel, signal }: IConfirmOperationOptions = {}
): Promise<OperationEntry> {
  if (!initializedAt) {
    initializedAt = Date.now();
  }

  if (initializedAt && initializedAt + CONFIRM_TIMEOUT < Date.now()) {
    throw new Error('Confirmation polling timed out');
  }

  const startedAt: number = Date.now();
  let currentBlockLevel = -1;

  try {
    const currentBlock: BlockResponse = await mavryk.rpc.getBlock();

    currentBlockLevel = currentBlock.header.level;

    for (let i: number = fromBlockLevel ?? currentBlockLevel; i <= currentBlockLevel; i++) {
      const block: BlockResponse =
        i === currentBlockLevel ? currentBlock : await mavryk.rpc.getBlock({ block: i as any });
      const opEntry: any = await findOperation(block, opHash);

      if (opEntry) {
        return opEntry;
      }
    }
  } catch (err) {
    if (networkConfig.network === 'development') {
      console.error(err);
    }
  }

  if (signal?.aborted) {
    throw new Error('Cancelled');
  }

  const timeToWait: number = Math.max(startedAt + SYNC_INTERVAL - Date.now(), 0);

  // eslint-disable-next-line promise/param-names
  await new Promise((r) => setTimeout(r, timeToWait));

  return confirmOperation(mavryk, opHash, {
    initializedAt,
    fromBlockLevel: currentBlockLevel !== -1 ? currentBlockLevel + 1 : fromBlockLevel,
    signal
  });
}

export async function findOperation(block: BlockResponse, opHash: string): Promise<OperationEntry | null> {
  for (let i = 3; i >= 0; i--) {
    for (const op of block.operations[i]) {
      if (op.hash === opHash) {
        return op;
      }
    }
  }

  return null;
}

// export function getOriginatedContractAddress(opEntry: OperationEntry): string {
//   const results: (OperationContents | OperationContentsAndResult)[] =
//     Array.isArray(opEntry.contents) ? opEntry.contents : [opEntry.contents];
//   const originationOp: OperationContentsAndResultOrigination = results.find(
//     (op) => op.kind === OpKind.ORIGINATION
//   ) as OperationContentsAndResultOrigination;
//
//   return (
//     originationOp?.metadata?.operation_result?.originated_contracts?.[0] ?? null
//   );
// }
