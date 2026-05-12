import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { PrismaModule } from '../../shared/prisma/prisma.module';
import { Login } from './application/use-cases/login';
import { AuthController } from './adapters/in/http/auth.controller';
import { Argon2PasswordHasher } from './adapters/out/argon2-password-hasher.adapter';
import { JoseJwtSigner } from './adapters/out/jose-jwt-signer.adapter';
import { NoopAuditLogger } from './adapters/out/noop-audit-logger.adapter';
import { PrismaUserRepository } from './adapters/out/prisma-user-repository.adapter';
import { SystemClock } from './adapters/out/system-clock.adapter';
import { AuditLogger } from './application/ports/out/audit-logger.port';
import { Clock } from './application/ports/out/clock.port';
import { PasswordHasher } from './application/ports/out/password-hasher.port';
import { TokenSigner } from './application/ports/out/token-signer.port';
import { UserRepository } from './application/ports/out/user-repository.port';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  controllers: [AuthController],
  providers: [
    {
      provide: 'JWT_SECRET',
      inject: [ConfigService],
      useFactory: (config: ConfigService): string => config.getOrThrow<string>('JWT_SECRET'),
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
      provide: 'CLOCK',
      useClass: SystemClock,
    },
    {
      provide: 'USER_REPOSITORY',
      useClass: PrismaUserRepository,
    },
    {
      provide: 'AUDIT_LOGGER',
      useClass: NoopAuditLogger,
    },
    {
      provide: 'LOGIN_USE_CASE',
      inject: ['USER_REPOSITORY', 'PASSWORD_HASHER', 'TOKEN_SIGNER', 'CLOCK', 'AUDIT_LOGGER'],
      useFactory: (
        users: UserRepository,
        passwords: PasswordHasher,
        tokens: TokenSigner,
        clock: Clock,
        auditLogger: AuditLogger,
      ): Login => new Login(users, passwords, tokens, clock, auditLogger),
    },
  ],
})
export class AuthModule {}
