import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ContractService } from './contract.service.js';
import { ContractConfig } from './contract.config.js';
import { ConfigModule } from './config.module.js';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(ContractConfig)],
  controllers: [],
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractModule {}
