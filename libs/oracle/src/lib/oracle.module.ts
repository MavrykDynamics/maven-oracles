import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NodeService } from './node.service.js';
import { OracleConfig } from './oracle.config.js';
import { PacemakerNetworkService } from './pacemaker/pacemaker.network.service.js';
import { ReportGenNetworkService } from './reportgen/reportgen.network.service.js';
import { EventHubService } from './eventhub.service.js';
import { ContractService } from './contract.service.js';
import { PriceService } from './price.service.js';
import { MessariFetcherModule } from '@tezosdynamics/messari-fetcher';
import { CoingeckoFetcherModule } from '@tezosdynamics/coingecko-fetcher';
import { AlphavantageFetcherModule } from '@tezosdynamics/alphavantage-fetcher';
import { PacemakerFactoryService } from './pacemaker/pacemaker.factory.service.js';
import { ReportGenFactoryService } from './reportgen/reportgen.factory.service.js';
import { StreamManagerService } from './stream-manager.service.js';
import { TransmitService } from './transmit/transmit.service.js';
import { TxManagerModule } from '@tezosdynamics/tx-manager';
import { ConfigModule } from '@tezosdynamics/config';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forConfig(OracleConfig),
    TxManagerModule,
    MessariFetcherModule,
    CoingeckoFetcherModule,
    AlphavantageFetcherModule
  ],
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
    TransmitService,
    EventHubService,
    StreamManagerService
  ],
  exports: [NodeService]
})
export class OracleModule {}
