import { Module } from '@nestjs/common';
import { BootstrapService } from './bootstrap.service.js';
import { BootstrapConfig } from './bootstrap.config.js';
import { ConfigModule } from '@tezosdynamics/config';

@Module({
  imports: [ConfigModule.forConfig(BootstrapConfig)],
  controllers: [],
  providers: [BootstrapService],
  exports: [BootstrapService]
})
export class BootstrapModule {}
