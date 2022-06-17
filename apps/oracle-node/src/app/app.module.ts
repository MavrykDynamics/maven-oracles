import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';

import { ModuleMetadata } from '@nestjs/common/interfaces/modules/module-metadata.interface';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  public static forRoot(): DynamicModule {
    const imports: ModuleMetadata['imports'] = [];

    return {
      module: AppModule,
      imports: imports,
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  configure(consumer: MiddlewareConsumer): any {
    // No op
  }
}
