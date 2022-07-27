import { Injectable, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import { PacemakerNetworkService } from './pacemaker.network.service.js';
import { EventHubService } from '../eventhub.service.js';
import { ContractService } from '../contract.service.js';
import { PacemakerService } from './pacemaker.service.js';
import { IPacemakerConfig } from './pacemaker.config.js';
import { ReportGenFactoryService } from '../reportgen/reportgen.factory.service.js';

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
    const { aggregatorFactoryAddress, aggregatorFactoryPairs} = this._oracleConfig;
    const aggregatorFactoryPairsArray: string[] = aggregatorFactoryPairs.split(" ");
    const factoryStorage = await this._contractService.getAggregatorFactoryStorage(aggregatorFactoryAddress);
    for (const pair of aggregatorFactoryPairsArray){
      const pairArray = pair.split("/");
      const aggregatorAddress = factoryStorage.get({0: pairArray[0], 1: pairArray[1]}) as string;
      await this.startPacemaker({
        aggregatorAddress
      });
    }
  }

  public async startPacemaker(config: IPacemakerConfig): Promise<PacemakerService> {
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
