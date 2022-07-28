import { Module } from '@nestjs/common';
import { TxManagerService } from './tx-manager.service.js';
import { ConfigModule } from './config.module.js';
import { TxManagerConfig } from './tx-manager.config.js';
import { ScheduleModule } from '@nestjs/schedule';
@Module({
  imports: [ConfigModule.forConfig(TxManagerConfig), ScheduleModule.forRoot()],
  controllers: [],
  providers: [TxManagerService],
  exports: [TxManagerService]
})
export class TxManagerModule {}
