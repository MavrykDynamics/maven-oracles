import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(AppModule.forRoot(), {
    logger: false
  });
}

await bootstrap();
