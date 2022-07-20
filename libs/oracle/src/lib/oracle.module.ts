import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NodeService } from './node.service.js';
import { OracleConfig } from './oracle.config.js';
import { ConfigModule } from './config.module.js';
import { PacemakerNetworkService } from './pacemaker/pacemaker.network.service.js';
import { ReportGenNetworkService } from './reportgen/reportgen.network.service.js';
import { EventHubService } from './eventhub.service.js';
import { ContractService } from './contract.service.js';
import { PriceService } from './price.service.js';
import { MessariFetcherService } from './messari-fetcher.service.js';
import { CoingeckoFetcherService } from './coingecko-fetcher.service.js';
import { AlphavantageFetcherService } from './alphavantage-fetcher.service.js';
import { PacemakerFactoryService } from './pacemaker/pacemaker.factory.service.js';
import { ReportGenFactoryService } from './reportgen/reportgen.factory.service.js';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(OracleConfig)],
  controllers: [],
  providers: [
    {
      provide: NodeService,
      useFactory: async (oracleConfig: OracleConfig, contractService: ContractService) => {
        const node = new NodeService(oracleConfig, contractService);
        await node.init();
        return node;
      },
      inject: [OracleConfig, ContractService]
    },
    ContractService,
    PacemakerFactoryService,
    PacemakerNetworkService,
    PriceService,
    ReportGenFactoryService,
    ReportGenNetworkService,
    EventHubService,
    MessariFetcherService,
    CoingeckoFetcherService,
    AlphavantageFetcherService
  ],
  exports: [NodeService]
})
export class OracleModule {}
