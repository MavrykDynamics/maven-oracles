import { Module } from '@nestjs/common';
import { CoinbaseFetcherService } from './coinbase-fetcher.service.js';
import { HttpModule } from '@nestjs/axios';
import { CoinbaseFetcherConfig } from './coinbase-fetcher.config.js';
import { ConfigModule } from '@mavrykdynamics/config';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(CoinbaseFetcherConfig)],
  controllers: [],
  providers: [CoinbaseFetcherService],
  exports: [CoinbaseFetcherService]
})
export class CoinbaseFetcherModule {}
