import { Injectable, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import { PacemakerNetworkService } from './pacemaker.network.service.js';
import { EventHubService } from '../event-hub/index.js';
import { ContractService } from '../contract/index.js';
import { PacemakerService } from './pacemaker.service.js';
import { IPacemakerConfig } from './pacemaker.config.js';
import { ReportGenFactoryService } from '../reportgen/index.js';

// Mavryk basenet block time. Pacemaker timers are kept as slow multiples of it to avoid draining the price APIs.
const BLOCK_TIME_MILLISECONDS = 10 * 1000;

@Injectable()
export class PacemakerFactoryService implements OnModuleInit {
  // map of the pacemakers we will start on the init
  public pacemakers: Map<string, PacemakerService> = new Map();

  public constructor(
    private readonly _oracleConfig: OracleConfig,
    private readonly _pacemakerNetworkService: PacemakerNetworkService,
    private readonly _eventHubService: EventHubService,
    private readonly _contractService: ContractService,
    private readonly _reportGenFactoryService: ReportGenFactoryService
  ) {}

  public async onModuleInit(): Promise<void> {
    // we get the aggregator addresses and pairs from the config
    const { aggregatorAddresses } = this._oracleConfig;
    const aggregatorAddressesArray = this._contractService.getAggregatorAddresses(aggregatorAddresses);

    // for each aggregator, we start a new pacemaker service
    for (const aggregatorAddress of aggregatorAddressesArray) {
      const aggregatorName = await this._contractService.getName(aggregatorAddress);
      const pairArray = aggregatorName.split('/');

      // Check if the pair is correct
      if (pairArray.length !== 2) {
        throw new Error(`${aggregatorName} is not a pair`);
      }

      const pair: [string, string] = [pairArray[0], pairArray[1]];

      await this._startPacemaker({
        aggregatorAddress,
        aggregatorPair: pair,
        // Production cadence: 30s progress / 20s resend (restored from the 360x/1h
        // slowdown that had been applied only to conserve price-API rate limits).
        timerProgressDurationMiliseconds: 3 * BLOCK_TIME_MILLISECONDS,
        timerResendDurationMiliseconds: 2 * BLOCK_TIME_MILLISECONDS,
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
