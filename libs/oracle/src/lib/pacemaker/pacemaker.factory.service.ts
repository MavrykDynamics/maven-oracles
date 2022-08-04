import { Injectable, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import { PacemakerNetworkService } from './pacemaker.network.service.js';
import { EventHubService } from '../event-hub/index.js';
import { ContractService } from '../contract/index.js';
import { PacemakerService } from './pacemaker.service.js';
import { IPacemakerConfig } from './pacemaker.config.js';
import { ReportGenFactoryService } from '../reportgen/index.js';

@Injectable()
export class PacemakerFactoryService implements OnModuleInit {
  public pacemakers: Map<string, PacemakerService> = new Map();

  public constructor(
    private readonly _oracleConfig: OracleConfig,
    private readonly _pacemakerNetworkService: PacemakerNetworkService,
    private readonly _eventHubService: EventHubService,
    private readonly _contractService: ContractService,
    private readonly _reportGenFactoryService: ReportGenFactoryService
  ) {}

  public async onModuleInit(): Promise<void> {
    const { aggregatorFactoryAddress } = this._oracleConfig;
    const factoryStorage = await this._contractService.getAggregatorFactoryStorage(aggregatorFactoryAddress);

    for (const [pair, aggregatorAddress] of factoryStorage.entries()) {
      await this._startPacemaker({
        aggregatorAddress,
        aggregatorPair: [pair['0'], pair['1']]
      });
    }
  }

  private async _startPacemaker(config: IPacemakerConfig): Promise<PacemakerService> {
    if (this.pacemakers.has(config.aggregatorAddress)) {
      throw new Error(`Pacemaker with aggregator address ${config.aggregatorAddress} already exists`);
    }
    const pacemaker = new PacemakerService(
      this._oracleConfig,
      this._pacemakerNetworkService,
      this._eventHubService,
      this._contractService,
      this._reportGenFactoryService,
      config
    );
    this.pacemakers.set(config.aggregatorAddress, pacemaker);
    await pacemaker.initialize();
    return pacemaker;
  }
}
