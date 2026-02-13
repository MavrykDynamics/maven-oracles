import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@mavrykdynamics/config';
import { OddGovFetcherService } from './odd-gov-fetcher.service.js';
import { OddGovFetcherConfig } from './odd-gov-fetcher.config.js';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(OddGovFetcherConfig)],
  controllers: [],
  providers: [OddGovFetcherService],
  exports: [OddGovFetcherService]
})
export class OddGovFetcherModule {}