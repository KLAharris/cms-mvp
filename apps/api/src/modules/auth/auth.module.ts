import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { PrismaModule } from '../../shared/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuditLoggerAdapter } from '../audit/adapters/out/persistence/audit-logger.adapter';
import { PrismaAuditRepository } from '../audit/adapters/out/persistence/prisma-audit.repository';
import { AuditPort } from '../audit/domain';
import { Login } from './application/use-cases/login';
import { Logout } from './application/use-cases/logout';
import { Refresh } from './application/use-cases/refresh';
import { AuthController } from './adapters/in/http/auth.controller';
import { Argon2PasswordHasher } from './adapters/out/argon2-password-hasher.adapter';
import { JoseJwtSigner } from './adapters/out/jose-jwt-signer.adapter';
import { JoseJwtVerifier } from './adapters/out/jose-jwt-verifier.adapter';
import { PrismaUserRepository } from './adapters/out/prisma-user-repository.adapter';
import { RedisRateLimiter } from './adapters/out/redis-rate-limiter.adapter';
import { RedisTokenBlocklist } from './adapters/out/redis-token-blocklist.adapter';
import { SystemClock } from './adapters/out/system-clock.adapter';
import { AuditLogger } from './application/ports/out/audit-logger.port';
import { Clock } from './application/ports/out/clock.port';
import { PasswordHasher } from './application/ports/out/password-hasher.port';
import { RateLimiter } from './application/ports/out/rate-limiter.port';
import { TokenBlocklist } from './application/ports/out/token-blocklist.port';
import { TokenSigner } from './application/ports/out/token-signer.port';
import { TokenVerifier } from './application/ports/out/token-verifier.port';
import { UserRepository } from './application/ports/out/user-repository.port';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [
    {
      provide: 'JWT_SECRET',
      inject: [ConfigService],
      useFactory: (config: ConfigService): string => config.getOrThrow<string>('JWT_SECRET'),
    },
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
        });

        redis.on('error', () => undefined);

        return redis;
      },
    },
    {
      provide: 'PASSWORD_HASHER',
      useClass: Argon2PasswordHasher,
    },
    {
      provide: 'TOKEN_SIGNER',
      useClass: JoseJwtSigner,
    },
    {
      provide: 'TOKEN_VERIFIER',
      useClass: JoseJwtVerifier,
    },
    {
      provide: 'TOKEN_BLOCKLIST',
      useClass: RedisTokenBlocklist,
    },
    {
      provide: 'RATE_LIMITER',
      useClass: RedisRateLimiter,
    },
    {
      provide: 'CLOCK',
      useClass: SystemClock,
    },
    {
      provide: 'USER_REPOSITORY',
      useClass: PrismaUserRepository,
    },
    {
      provide: 'AUDIT_LOGGER',
      inject: [PrismaService],
      useFactory: (prisma: PrismaService): AuditLogger => {
        const audit: AuditPort = new PrismaAuditRepository(prisma);
        return new AuditLoggerAdapter(audit);
      },
    },
    {
      provide: 'LOGIN_USE_CASE',
      inject: [
        'USER_REPOSITORY',
        'PASSWORD_HASHER',
        'TOKEN_SIGNER',
        'CLOCK',
        'AUDIT_LOGGER',
        'RATE_LIMITER',
      ],
      useFactory: (
        users: UserRepository,
        passwords: PasswordHasher,
        tokens: TokenSigner,
        clock: Clock,
        auditLogger: AuditLogger,
        rateLimiter: RateLimiter,
      ): Login => new Login(users, passwords, tokens, clock, auditLogger, rateLimiter),
    },
    {
      provide: 'REFRESH_USE_CASE',
      inject: [
        'TOKEN_VERIFIER',
        'TOKEN_SIGNER',
        'TOKEN_BLOCKLIST',
        'CLOCK',
        'AUDIT_LOGGER',
        'USER_REPOSITORY',
      ],
      useFactory: (
        tokenVerifier: TokenVerifier,
        tokenSigner: TokenSigner,
        tokenBlocklist: TokenBlocklist,
        clock: Clock,
        auditLogger: AuditLogger,
        userRepository: UserRepository,
      ): Refresh =>
        new Refresh(
          tokenVerifier,
          tokenSigner,
          tokenBlocklist,
          clock,
          auditLogger,
          userRepository,
        ),
    },
    {
      provide: 'LOGOUT_USE_CASE',
      inject: ['TOKEN_VERIFIER', 'TOKEN_BLOCKLIST', 'CLOCK', 'AUDIT_LOGGER'],
      useFactory: (
        tokenVerifier: TokenVerifier,
        tokenBlocklist: TokenBlocklist,
        clock: Clock,
        auditLogger: AuditLogger,
      ): Logout => new Logout(tokenVerifier, tokenBlocklist, clock, auditLogger),
    },
  ],
  exports: ['JWT_SECRET', 'USER_REPOSITORY', 'PASSWORD_HASHER', 'CLOCK'],
})
export class AuthModule {}
