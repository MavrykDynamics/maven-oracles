import { Module } from '@nestjs/common';
import { MessariFetcherService } from './messari-fetcher.service.js';
import { HttpModule } from '@nestjs/axios';
import { MessariFetcherConfig } from './messari-fetcher.config.js';
import { ConfigModule } from '@mavrykdynamics/config';

@Module({
  imports: [HttpModule, ConfigModule.forConfig(MessariFetcherConfig)],
  controllers: [],
  providers: [MessariFetcherService],
  exports: [MessariFetcherService]
})
export class MessariFetcherModule {}
