import { Injectable, OnModuleInit } from '@nestjs/common';
import { WalletParamsWithKind } from '@mavrykdynamics/webmavryk/dist/types/wallet/wallet';
import { PollingSubscribeProvider, MavrykToolkit, Signer } from '@mavrykdynamics/webmavryk';
import { TxManagerConfig } from './tx-manager.config.js';
import { filter, firstValueFrom, Subject } from 'rxjs';
import { BatchWalletOperation } from '@mavrykdynamics/webmavryk/dist/types/wallet/batch-operation';
import { CronExpression } from '@nestjs/schedule';
import { Mutex } from 'async-mutex';
import { randomUUID } from 'crypto';
import { ParamsWithKind } from '@mavrykdynamics/webmavryk/dist/types/operations/types';
import { CronJob } from 'cron';
import { getLogger } from './logger.js';
import { Logger } from 'winston';
import { RemoteSigner } from '@mavrykdynamics/webmavryk-remote-signer';

interface IBatchQueueRequest {
  uuid: string;
  requests: WalletParamsWithKind[];
}
type Pool = IBatchQueueRequest[];

interface IBatchQueueResponseSuccess {
  type: 'success';
  uuid: string;
  response: BatchWalletOperation;
}

interface IBatchQueueResponseError {
  type: 'error';
  uuid: string;
  error: Error;
}

type BatchQueueResponse = IBatchQueueResponseSuccess | IBatchQueueResponseError;

// Reject a promise if it does not settle in time. Without this a stalled webmavryk
// estimate/send/confirmation call hangs `_executeBatch` forever while holding the
// async-mutex, which silently freezes every subsequent transmit. Turning a stall into
// an error lets the mutex release and the next report retry (and surfaces the cause).
function withTimeout<T>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${milliseconds}ms`)), milliseconds);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

@Injectable()
export class TxManagerService implements OnModuleInit {
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: TxManagerService.name
    }
  });
  private _pool: Pool = [];
  private _mavrykToolkit: MavrykToolkit;
  private _batchResponse$: Subject<BatchQueueResponse> = new Subject();
  private _mutex: Mutex = new Mutex();
  private _cronJob: CronJob;

  public constructor(private readonly _txManagerConfig: TxManagerConfig) {}

  public onModuleInit(): void {
    this._logger.verbose(
      `Using confirmation polling interval: ${this._txManagerConfig.pollingIntervalMilliseconds}ms`
    );

    this._cronJob = new CronJob(CronExpression.EVERY_SECOND, async () => {
      try {
        await this._executeBatches();
      } catch (e) {
        this._logger.error(`Uncaught error in executeBatches: ${e.toString()}`);
      }
    });

    this._cronJob.start();
  }

  public async addBatch(batch: WalletParamsWithKind[]): Promise<BatchQueueResponse> {
    const uuid = randomUUID();

    this._pool.push({
      uuid,
      requests: batch
    });

    return await firstValueFrom(this._batchResponse$.pipe(filter((response) => response.uuid === uuid)));
  }

  private async _executeBatches(): Promise<void> {
    if (this._mutex.isLocked()) {
      return;
    }

    await this._mutex.runExclusive(async () => {
      await this._executePool();
    });
  }

  private async _executePool(): Promise<void> {
    const initialPoolSize = this._pool.length;

    if (initialPoolSize === 0) {
      // Nothing to batch
      return;
    }

    this._logger.debug(`Execution pool of size ${initialPoolSize}`);

    while (this._pool.length !== 0) {
      this._logger.debug(`Pool execution status: ${this._pool.length}/${initialPoolSize} remaining`);

      const batch = this._pool.shift();
      if (batch === undefined) {
        return;
      }
      await this._executeBatch(batch);
    }
  }

  private async _executeBatch({ requests, uuid }: IBatchQueueRequest): Promise<void> {
    if (requests.length === 0) {
      // Nothing to batch
      return;
    }

    const toolkit = await this.getMavrykToolkit();

    const pkh = await toolkit.wallet.pkh();
    const estimateInput: ParamsWithKind[] = requests.map((value) => ({
      ...value,
      source: pkh
    }));

    try {
      // Each webmavryk step is logged and time-boxed so we can see exactly where the
      // transmit stalls (previously a hang here produced no log and no response at all).
      this._logger.debug(`Estimating batch of ${requests.length} op(s) for ${pkh}`);
      await withTimeout(toolkit.estimate.batch(estimateInput), 60_000, 'estimate.batch');

      this._logger.debug(`Forging/signing/injecting batch of ${requests.length} op(s)`);
      const batchOp = await withTimeout(toolkit.wallet.batch(requests).send(), 60_000, 'wallet.batch.send');
      this._logger.info(`Injected op ${batchOp.opHash}, awaiting confirmation`);

      await withTimeout(batchOp.confirmation(), 120_000, 'confirmation');

      this._logger.verbose(`Batched ${requests.length} transactions (op ${batchOp.opHash})`);
      this._batchResponse$.next({
        type: 'success',
        uuid: uuid,
        response: batchOp
      });
    } catch (e) {
      this._logger.error(
        `Batch execution failed for ${JSON.stringify(estimateInput)}: ${e?.toString?.() ?? e}`
      );
      this._batchResponse$.next({
        type: 'error',
        uuid: uuid,
        error: e as Error
      });
    }
  }

  public async getMavrykToolkit(): Promise<MavrykToolkit> {
    if (this._mavrykToolkit) {
      return this._mavrykToolkit;
    }

    const toolkit = new MavrykToolkit(this._txManagerConfig.rpcUrl);
    // const signer = new InMemorySigner(this._txManagerConfig.mavrykSecretKey);
    const signer = new RemoteSigner(
      this._txManagerConfig.mavrykPublicKeyHash,
      this._txManagerConfig.signerUrl
    );

    // webmavryk-remote-signer implements the webmavryk Signer interface, which is
    // structurally identical to webmavryk's (same fork lineage: publicKey /
    // publicKeyHash / secretKey / sign -> { bytes, sig, prefixSig, sbytes }).
    // The cast bridges the two nominally-distinct toolkit types while the rest
    // of the app still runs on webmavryk's MavrykToolkit.
    toolkit.setSignerProvider(signer as unknown as Signer);

    toolkit.setStreamProvider(
      toolkit.getFactory(PollingSubscribeProvider)({
        pollingIntervalMilliseconds: this._txManagerConfig.pollingIntervalMilliseconds
      })
    );

    this._mavrykToolkit = toolkit;

    return toolkit;
  }
}
