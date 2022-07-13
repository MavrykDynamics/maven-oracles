/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @rushstack/typedef-var */

import { DynamicModule, Module } from '@nestjs/common';
import { TSConvict } from 'ts-convict';

interface IClassType {
  new (): any;
}

@Module({})
export class ConfigModule {
  public static forConfig(configClass: IClassType | IClassType[]): DynamicModule {
    const configClasses = Array.isArray(configClass) ? configClass : [configClass];

    return {
      providers: configClasses.map((configClass) => ({
        useFactory: () => {
          const loader = new TSConvict(configClass);
          return loader.load();
        },
        provide: configClass
      })),
      exports: configClasses,
      module: ConfigModule
    };
  }
}
