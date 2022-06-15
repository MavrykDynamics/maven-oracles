import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from './config.module';
import { AlphavantageFetcherConfig } from './alphavantage-fetcher.config';
import { AlphavantageFetcherService } from './alphavantage-fetcher.service';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(AlphavantageFetcherConfig)],
  controllers: [],
  providers: [AlphavantageFetcherService],
  exports: [AlphavantageFetcherService],
})
export class AlphavantageFetcherModule {}
