import http from 'node:http';
import https from 'node:https';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module.js';

// Node 19+ defaults globalAgent to keepAlive:true; the Mavryk RPC closes idle sockets, so reused connections fail with ECONNRESET.
http.globalAgent = new http.Agent({ keepAlive: false });
https.globalAgent = new https.Agent({ keepAlive: false });

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(AppModule.forRoot(), {
    logger: false
  });
}

await bootstrap();
