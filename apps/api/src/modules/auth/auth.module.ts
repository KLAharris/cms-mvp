import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';

import { PrismaModule } from '../../shared/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { NotificationModule, NotificationService } from '../notification';
import { AuditLoggerAdapter } from '../audit/adapters/out/persistence/audit-logger.adapter';
import { PrismaAuditRepository } from '../audit/adapters/out/persistence/prisma-audit.repository';
import { AuditPort } from '../audit';
import { Login } from './application/use-cases/login';
import { Logout } from './application/use-cases/logout';
import { Refresh } from './application/use-cases/refresh';
import { RequestPasswordReset } from './application/use-cases/request-password-reset';
import { ResetPassword } from './application/use-cases/reset-password';
import { AuthController } from './adapters/in/http/auth.controller';
import { Argon2PasswordHasher } from './adapters/out/argon2-password-hasher.adapter';
import { JoseJwtSigner } from './adapters/out/jose-jwt-signer.adapter';
import { JoseJwtVerifier } from './adapters/out/jose-jwt-verifier.adapter';
import { NodeResetTokenGenerator } from './adapters/out/node-reset-token-generator.adapter';
import { PrismaPasswordResetTokenRepository } from './adapters/out/prisma-password-reset-token-repository.adapter';
import { PrismaPasswordResetUnitOfWork } from './adapters/out/prisma-password-reset-unit-of-work.adapter';
import { PrismaUserRepository } from './adapters/out/prisma-user-repository.adapter';
import { RedisRateLimiter } from './adapters/out/redis-rate-limiter.adapter';
import { RedisTokenBlocklist } from './adapters/out/redis-token-blocklist.adapter';
import { SystemClock } from './adapters/out/system-clock.adapter';
import { AuditLogger } from './application/ports/out/audit-logger.port';
import { Clock } from './application/ports/out/clock.port';
import { PasswordHasher } from './application/ports/out/password-hasher.port';
import { PasswordResetNotifier } from './application/ports/out/password-reset-notifier.port';
import { PasswordResetTokenPort } from './application/ports/out/password-reset-token.port';
import { PasswordResetUnitOfWork } from './application/ports/out/password-reset-unit-of-work.port';
import { RateLimiter } from './application/ports/out/rate-limiter.port';
import { ResetTokenGenerator } from './application/ports/out/reset-token-generator.port';
import { TokenBlocklist } from './application/ports/out/token-blocklist.port';
import { TokenSigner } from './application/ports/out/token-signer.port';
import { TokenVerifier } from './application/ports/out/token-verifier.port';
import { UserRepository } from './application/ports/out/user-repository.port';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60 * 60 * 1000, limit: 5 }]),
    NotificationModule,
    PrismaModule,
    forwardRef(() => UsersModule),
  ],
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
      provide: 'PASSWORD_RESET_TOKEN_REPOSITORY',
      useClass: PrismaPasswordResetTokenRepository,
    },
    {
      provide: 'PASSWORD_RESET_UNIT_OF_WORK',
      useClass: PrismaPasswordResetUnitOfWork,
    },
    {
      provide: 'RESET_TOKEN_GENERATOR',
      useClass: NodeResetTokenGenerator,
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
    {
      provide: 'REQUEST_PASSWORD_RESET_USE_CASE',
      inject: [
        'USER_REPOSITORY',
        'PASSWORD_RESET_TOKEN_REPOSITORY',
        'RESET_TOKEN_GENERATOR',
        'CLOCK',
        NotificationService,
      ],
      useFactory: (
        users: UserRepository,
        resetTokens: PasswordResetTokenPort,
        tokenGenerator: ResetTokenGenerator,
        clock: Clock,
        notifier: PasswordResetNotifier,
      ): RequestPasswordReset =>
        new RequestPasswordReset(users, resetTokens, tokenGenerator, clock, notifier),
    },
    {
      provide: 'RESET_PASSWORD_USE_CASE',
      inject: [
        'USER_REPOSITORY',
        'PASSWORD_RESET_TOKEN_REPOSITORY',
        'PASSWORD_HASHER',
        'CLOCK',
        'PASSWORD_RESET_UNIT_OF_WORK',
      ],
      useFactory: (
        users: UserRepository,
        resetTokens: PasswordResetTokenPort,
        passwordHasher: PasswordHasher,
        clock: Clock,
        unitOfWork: PasswordResetUnitOfWork,
      ): ResetPassword =>
        new ResetPassword(users, resetTokens, passwordHasher, clock, unitOfWork),
    },
  ],
  exports: ['JWT_SECRET', 'USER_REPOSITORY', 'PASSWORD_HASHER', 'CLOCK'],
})
export class AuthModule {}
