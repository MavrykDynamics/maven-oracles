import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OracleService } from './oracle.service.js';
import { OracleConfig } from './oracle.config.js';
import { ConfigModule } from './config.module.js';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(OracleConfig)],
  controllers: [],
  providers: [OracleService],
  exports: [OracleService],
})
export class OracleModule {}
