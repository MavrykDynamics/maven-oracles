import { Module } from '@nestjs/common';
import { BootstrapService } from './bootstrap.service.js';
import { ConfigModule } from './config.module.js';
import { BootstrapConfig } from './bootstrap.config.js';

@Module({
  imports: [ConfigModule.forConfig(BootstrapConfig)],
  controllers: [],
  providers: [BootstrapService],
  exports: [BootstrapService]
})
export class BootstrapModule {}
