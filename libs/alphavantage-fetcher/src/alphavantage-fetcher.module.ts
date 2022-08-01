import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AlphavantageFetcherConfig } from './alphavantage-fetcher.config.js';
import { AlphavantageFetcherService } from './alphavantage-fetcher.service.js';
import { ConfigModule } from '@tezosdynamics/config';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(AlphavantageFetcherConfig)],
  controllers: [],
  providers: [AlphavantageFetcherService],
  exports: [AlphavantageFetcherService]
})
export class AlphavantageFetcherModule {}
