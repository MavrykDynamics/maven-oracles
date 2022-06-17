import {DynamicModule, MiddlewareConsumer, Module, NestModule,} from '@nestjs/common';

import {ModuleMetadata} from '@nestjs/common/interfaces/modules/module-metadata.interface';
import {BootstrapModule} from "../bootstrap/bootstrap.module.js";

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  public static forRoot(): DynamicModule {
    const imports: ModuleMetadata['imports'] = [];

    imports.push(BootstrapModule);

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
