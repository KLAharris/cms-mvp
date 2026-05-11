import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

import { HealthController } from './health/health.controller';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (request) => {
          const requestId = request.headers['x-request-id'];
          return (Array.isArray(requestId) ? requestId[0] : requestId) ?? randomUUID();
        },
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                },
              },
      },
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
