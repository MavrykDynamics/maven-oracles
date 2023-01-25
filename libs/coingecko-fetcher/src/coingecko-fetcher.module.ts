import { Module } from '@nestjs/common';
import { CoingeckoFetcherService } from './coingecko-fetcher.service.js';
import { HttpModule } from '@nestjs/axios';
import { CoingeckoFetcherConfig } from './coingecko-fetcher.config.js';
import { ConfigModule } from '@mavrykdynamics/config';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(CoingeckoFetcherConfig)],
  controllers: [],
  providers: [CoingeckoFetcherService],
  exports: [CoingeckoFetcherService]
})
export class CoingeckoFetcherModule {}
