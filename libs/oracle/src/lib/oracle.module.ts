import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NodeService } from './node.service.js';
import { OracleConfig } from './oracle.config.js';
import { ConfigModule } from './config.module.js';
import { PacemakerService } from './pacemaker.service.js';
import { PacemakerNetworkService } from './pacemaker.network.service.js';
import { ReportGenNetworkService } from './reportgen.network.service.js';
import { EventHubService } from './eventhub.service.js';
import { ReportGenFollowerService } from './reportgen.follower.service.js';
import { ReportGenLeaderService } from './reportgen.leader.service.js';
import { SmartContractMockService } from './smartcontract.mock.service.js';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(OracleConfig)],
  controllers: [],
  providers: [
    {
      provide: NodeService,
      useFactory: async (oracleConfig: OracleConfig, smartContractMockService: SmartContractMockService) => {
        const node = new NodeService(oracleConfig, smartContractMockService);
        await node.init();
        return node;
      },
      inject: [OracleConfig, SmartContractMockService]
    },
    PacemakerService,
    PacemakerNetworkService,
    ReportGenFollowerService,
    ReportGenLeaderService,
    ReportGenNetworkService,
    EventHubService,
    SmartContractMockService
  ],
  exports: [NodeService]
})
export class OracleModule {}
