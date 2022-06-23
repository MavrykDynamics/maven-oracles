import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NodeService } from './node.service.js';
import { OracleConfig } from './oracle.config.js';
import { ConfigModule } from './config.module.js';
import { PacemakerService } from './pacemaker.service.js';
import { PacemakerNetworkService } from './pacemaker.network.service.js';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(OracleConfig)],
  controllers: [],
  providers: [
    {
      provide: NodeService,
      useFactory: async (oracleConfig: OracleConfig) => {
        const node = new NodeService(oracleConfig);
        await node.init();
        return node;
      },
      inject: [OracleConfig]
    },
    PacemakerService,
    PacemakerNetworkService
  ],
  exports: [NodeService]
})
export class OracleModule {}
