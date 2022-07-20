import { Injectable } from '@nestjs/common';
import { ReportGenNetworkService } from './reportgen.network.service.js';
import { ReportGenFollowerService } from './reportgen.follower.service.js';
import { ReportGenLeaderService } from './reportgen.leader.service.js';
import { OracleConfig } from '../oracle.config.js';
import { EventHubService } from '../eventhub.service.js';
import { ContractService } from '../contract.service.js';
import { IReportGenConfig } from './reportgen.config.js';
import { PriceService } from '../price.service.js';

@Injectable()
export class ReportGenFactoryService {
  public reportgenFollowers: Map<string, ReportGenFollowerService> = new Map();
  public reportgenLeaders: Map<string, ReportGenLeaderService> = new Map();

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _reportgenNetworkService: ReportGenNetworkService,
    private readonly _eventHubService: EventHubService,
    private readonly _contractService: ContractService,
    private readonly _priceService: PriceService
  ) {}

  public startReportGen(config: IReportGenConfig): void {
    if (this.reportgenFollowers.has(config.aggregatorAddress)) {
      throw new Error(`ReportGen with aggregator address ${config.aggregatorAddress} already exists`);
    }
    const reportGenFollower = new ReportGenFollowerService(
      this._config,
      this._reportgenNetworkService,
      this._eventHubService,
      this._contractService,
      this._priceService,
      config
    );
    const reportGenLeader = new ReportGenLeaderService(
      this._config,
      this._reportgenNetworkService,
      this._eventHubService,
      this._contractService,
      config
    );
    this.reportgenFollowers.set(config.aggregatorAddress, reportGenFollower);
    this.reportgenLeaders.set(config.aggregatorAddress, reportGenLeader);
  }

  public stopReportGen(aggregatorAddress: string): void {
    const reportGenFollower = this.reportgenFollowers.get(aggregatorAddress);
    const reportGenLeader = this.reportgenLeaders.get(aggregatorAddress);

    reportGenFollower?.stop();
    reportGenLeader?.stop();

    this.reportgenFollowers.delete(aggregatorAddress);
    this.reportgenLeaders.delete(aggregatorAddress);
  }
}
