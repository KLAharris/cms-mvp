import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { ContentModule } from './modules/content/content.module';
import { MediaModule } from './modules/media/media.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        redact: {
          paths: [
            'req.headers["x-api-key"]',
            'req.headers.authorization',
          ],
          censor: '[REDACTED]',
        },
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
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AuthModule,
    AuditModule,
    UsersModule,
    ContentModule,
    MediaModule,
    ApiKeysModule,
    PublicApiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
