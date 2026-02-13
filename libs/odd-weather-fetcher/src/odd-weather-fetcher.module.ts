import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@mavrykdynamics/config';
import { OddWeatherFetcherService } from './odd-weather-fetcher.service.js';
import { OddWeatherFetcherConfig } from './odd-weather-fetcher.config.js';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(OddWeatherFetcherConfig)],
  controllers: [],
  providers: [OddWeatherFetcherService],
  exports: [OddWeatherFetcherService]
})
export class OddWeatherFetcherModule {}