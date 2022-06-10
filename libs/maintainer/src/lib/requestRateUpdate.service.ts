import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CronJob } from 'cron';
import { MaintainerConfig } from './maintainer.config';
import { ContractProvider, OpKind } from '@taquito/taquito';
import {
  AggregatorContractAbstraction,
  AggregatorFactoryContractAbstraction,
} from '@mavryk-oracle-node/contracts';
import { Mutex } from 'async-mutex';
import { TxManagerService } from '@mavryk-oracle-node/tx-manager';
import { CronExpression } from '@nestjs/schedule';
import { WalletParamsWithKind } from '@taquito/taquito/dist/types/wallet/wallet';

@Injectable()
export class RequestRateUpdateService implements OnModuleInit {
  private readonly logger = new Logger(RequestRateUpdateService.name);
  private readonly cronJob: CronJob;
  private readonly mutex = new Mutex();

  constructor(
    private readonly maintainerConfig: MaintainerConfig,
    private readonly txManagerService: TxManagerService
  ) {
    if (maintainerConfig.rpcUrl === '') {
      throw new Error('RPC Url must be set (RPC_URL env variable)');
    }

    if (maintainerConfig.maintainerPkh === '') {
      throw new Error(
        'Maintainer pkh must be set (MAINTAINER_PKH env variable)'
      );
    }

    if (maintainerConfig.aggregatorFactorySmartContractAddress === '') {
      throw new Error(
        'Aggregator factory smart contract address must be set (AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS env variable)'
      );
    }

    this.logger.verbose(
      `Round duration: ${maintainerConfig.roundDurationMinutes} minutes`
    );

    this.cronJob = new CronJob(CronExpression.EVERY_5_SECONDS, async () => {
      try {
        await this.requestUpdateRate();
      } catch (e) {
        this.logger.error(
          `Uncaught error in requestUpdateRate: ${e.toString()}`
        );
      }
    });

    this.cronJob.start();
  }

  async onModuleInit(): Promise<void> {
    this.logger.verbose(
      `Using maintainer address: ${this.maintainerConfig.maintainerPkh}`
    );
    this.logger.verbose(
      `Using AggregatorFactory address: ${this.maintainerConfig.aggregatorFactorySmartContractAddress}`
    );
    this.logger.verbose(`Using RPC url: ${this.maintainerConfig.rpcUrl}`);
  }

  private async requestUpdateRate() {
    if (this.mutex.isLocked()) {
      return;
    }

    const aggregators = await this.getAggregatorsAddresses();

    await this.mutex.runExclusive(async () => {
      const pairAndOp = await Promise.all(
        Array.from(aggregators.entries()).map(
          async ([pair, aggregatorSmartContractAddress]) => {
            return {
              pair,
              op: await this.getRequestRateUpdateOpOrNull(
                pair,
                aggregatorSmartContractAddress
              ),
            };
          }
        )
      );

      const notNullPairAndOps = this.filterNotNullOpPair(pairAndOp);

      if (notNullPairAndOps.length === 0) {
        return;
      }

      this.logger.verbose(
        `Sending requestRateUpdate: ${notNullPairAndOps.length} batched observation operations`
      );

      const result = await this.txManagerService.addBatch(
        this.maintainerConfig.maintainerPkh,
        notNullPairAndOps.map((pairAndOp) => pairAndOp.op)
      );

      switch (result.type) {
        case 'success':
          this.logger.log(
            `Request new round on ${
              notNullPairAndOps.length
            } pairs: ${notNullPairAndOps
              .map((pairAndOp) => `${pairAndOp.pair[0]}/${pairAndOp.pair[1]}`)
              .join(', ')}`
          );

          break;
        case 'error':
          this.logger.log(
            `Failed to request new round on ${
              notNullPairAndOps.length
            } pairs: ${notNullPairAndOps
              .map((pairAndOp) => `${pairAndOp.pair[0]}/${pairAndOp.pair[1]}`)
              .join(', ')}`
          );
      }
    });
  }

  public filterNotNullOpPair<T>(
    arr: { pair: [string, string]; op: T | null }[]
  ): { pair: [string, string]; op: T }[] {
    return arr.filter((op) => op.op !== null) as {
      pair: [string, string];
      op: T;
    }[];
  }

  private async getRequestRateUpdateOpOrNull(
    pair: [string, string],
    aggregatorSmartContractAddress: string
  ): Promise<WalletParamsWithKind | null> {
    try {
      return await this._getRequestRateUpdateOpOrNull(
        pair,
        aggregatorSmartContractAddress
      );
    } catch (e) {
      this.logger.error(
        `Error while trying to set observationCommit on pair ${pair[0]}/${
          pair[1]
        }: ${e.toString()}`
      );

      return null;
    }
  }

  private async _getRequestRateUpdateOpOrNull(
    pair: [string, string],
    aggregatorSmartContractAddress: string
  ): Promise<WalletParamsWithKind | null> {
    const aggregator = await this.getAggregator(aggregatorSmartContractAddress);

    const {
      round,
      lastCompletedRoundPrice: { round: lastCompletedRound },
      roundStart,
    } = await aggregator.storage();

    const minutesSinceLastRound =
      (Date.now() - Date.parse(roundStart)) / (60 * 1000);

    this.logger.debug(
      `Last ${pair[0]}/${pair[1]} round (#${lastCompletedRound}) was ${minutesSinceLastRound} ago, at ${roundStart}`
    );

    if (minutesSinceLastRound < this.maintainerConfig.roundDurationMinutes) {
      // Wait before starting new round
      return null;
    }

    return {
      kind: OpKind.TRANSACTION,
      ...aggregator.methods.requestRateUpdate().toTransferParams(),
    };
  }

  public async getAggregatorFactory(): Promise<
    AggregatorFactoryContractAbstraction<ContractProvider>
  > {
    const toolkit = await this.txManagerService.getTezosToolkit(
      this.maintainerConfig.maintainerPkh
    );
    let aggregatorFactory: AggregatorFactoryContractAbstraction<ContractProvider>;
    try {
      aggregatorFactory = await toolkit.contract.at<
        AggregatorFactoryContractAbstraction<ContractProvider>
      >(this.maintainerConfig.aggregatorFactorySmartContractAddress);
    } catch (e) {
      this.logger.error(
        `Error while fetching aggregator factory smart contract at ${
          this.maintainerConfig.aggregatorFactorySmartContractAddress
        } ${JSON.stringify(e)}`
      );
      throw e;
    }

    return aggregatorFactory;
  }

  private async getAggregatorsAddresses(): Promise<
    Map<[string, string], string>
  > {
    const aggregatorFactory = await this.getAggregatorFactory();
    const { trackedAggregators } = await aggregatorFactory.storage();

    const pairs = Array.from(await trackedAggregators.entries());

    const aggregators: Map<[string, string], string> = new Map<
      [string, string],
      string
    >();

    for (const [pair, address] of pairs) {
      aggregators.set([pair[0], pair[1]], address);
    }

    return aggregators;
  }

  public async getAggregator(
    aggregatorSmartContractAddress: string
  ): Promise<AggregatorContractAbstraction<ContractProvider>> {
    const toolkit = await this.txManagerService.getTezosToolkit(
      this.maintainerConfig.maintainerPkh
    );
    let aggregator: AggregatorContractAbstraction<ContractProvider>;
    try {
      aggregator = await toolkit.contract.at<
        AggregatorContractAbstraction<ContractProvider>
      >(aggregatorSmartContractAddress);
    } catch (e) {
      this.logger.error(
        `Error while fetching aggregator smart contract at ${aggregatorSmartContractAddress} ${JSON.stringify(
          e
        )}`
      );
      throw e;
    }

    return aggregator;
  }
}
