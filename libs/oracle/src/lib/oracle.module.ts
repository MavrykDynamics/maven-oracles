import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NodeService } from './node.service.js';
import { OracleConfig } from './oracle.config.js';
import { PacemakerNetworkService } from './pacemaker/pacemaker.network.service.js';
import { ReportGenNetworkService } from './reportgen/reportgen.network.service.js';
import { EventHubService } from './event-hub/event-hub.service.js';
import { ContractService } from './contract/contract.service.js';
import { DataService } from './data/data.service.js';
// Messari market-data now requires an Enterprise plan; replaced by Coinbase. Kept for future reactivation.
// import { MessariFetcherModule } from '@mavrykdynamics/messari-fetcher';
import { CoinbaseFetcherModule } from '@mavrykdynamics/coinbase-fetcher';
import { CoingeckoFetcherModule } from '@mavrykdynamics/coingecko-fetcher';
import { AlphavantageFetcherModule } from '@mavrykdynamics/alphavantage-fetcher';
import { PacemakerFactoryService } from './pacemaker/pacemaker.factory.service.js';
import { ReportGenFactoryService } from './reportgen/reportgen.factory.service.js';
import { StreamManagerService } from './stream-manager/stream-manager.service.js';
import { TransmitService } from './transmit/transmit.service.js';
import { TxManagerModule } from '@mavrykdynamics/tx-manager';
import { ConfigModule } from '@mavrykdynamics/config';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forConfig(OracleConfig),
    TxManagerModule,
    // MessariFetcherModule,
    CoinbaseFetcherModule,
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
    DataService,
    ReportGenFactoryService,
    ReportGenNetworkService,
    TransmitService,
    EventHubService,
    StreamManagerService
  ],
  exports: [NodeService]
})
export class OracleModule {}
