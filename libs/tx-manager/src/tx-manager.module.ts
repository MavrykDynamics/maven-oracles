import { Module } from '@nestjs/common';
import { TxManagerService } from './tx-manager.service.js';
import { TxManagerConfig } from './tx-manager.config.js';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@tezosdynamics/config';

@Module({
  imports: [ConfigModule.forConfig(TxManagerConfig), ScheduleModule.forRoot()],
  controllers: [],
  providers: [TxManagerService],
  exports: [TxManagerService]
})
export class TxManagerModule {}
