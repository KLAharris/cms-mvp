import { forwardRef, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './adapters/in/http/users.controller';
import { ResendEmailSenderAdapter } from './adapters/out/email/resend-email-sender.adapter';
import { NoopEmailSender } from './adapters/out/noop-email-sender.adapter';
import { UuidIdGenerator } from './adapters/out/uuid-id-generator.adapter';
import { AuditLogger } from './application/ports/out/audit-logger.port';
import { Clock } from './application/ports/out/clock.port';
import { EMAIL_SENDER, EmailSender } from './application/ports/out/email-sender.port';
import { IdGenerator } from './application/ports/out/id-generator.port';
import { PasswordHasher } from './application/ports/out/password-hasher.port';
import { UserRepository } from './application/ports/out/user-repository.port';
import { AcceptInvite } from './application/use-cases/accept-invite.use-case';
import { DeactivateUser } from './application/use-cases/deactivate-user.use-case';
import { InviteUser } from './application/use-cases/invite-user.use-case';
import { ListUsers } from './application/use-cases/list-users.use-case';
import { UpdateUser } from './application/use-cases/update-user.use-case';

@Module({
  imports: [forwardRef(() => AuditModule), forwardRef(() => AuthModule), ConfigModule, PrismaModule],
  controllers: [UsersController],
  providers: [
    JwtAuthGuard,
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EmailSender => {
        const provider = config.get<string>('EMAIL_PROVIDER', 'console');
        const logger = new Logger('UsersModule');

        if (provider === 'resend') {
          logger.log('Email provider: Resend');
          return new ResendEmailSenderAdapter(config);
        }

        if (provider === 'ses' || provider === 'smtp') {
          logger.warn(
            `Email provider '${provider}' not yet implemented. Falling back to NoopEmailSender.`,
          );
        } else {
          logger.log('Email provider: console (no-op)');
        }

        return new NoopEmailSender();
      },
    },
    {
      provide: 'ID_GENERATOR',
      useClass: UuidIdGenerator,
    },
    {
      provide: 'APP_BASE_URL',
      inject: [ConfigService],
      useFactory: (config: ConfigService): string =>
        config.get<string>('PUBLIC_URL') ??
        config.get<string>('APP_BASE_URL') ??
        'http://localhost:3000',
    },
    {
      provide: 'LIST_USERS_USE_CASE',
      inject: ['USER_REPOSITORY'],
      useFactory: (userRepository: UserRepository): ListUsers =>
        new ListUsers(userRepository),
    },
    {
      provide: 'INVITE_USER_USE_CASE',
      inject: [
        'USER_REPOSITORY',
        'PASSWORD_HASHER',
        EMAIL_SENDER,
        'CLOCK',
        'ID_GENERATOR',
        'AUDIT_LOGGER',
        'APP_BASE_URL',
      ],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        emailSender: EmailSender,
        clock: Clock,
        idGenerator: IdGenerator,
        auditLogger: AuditLogger,
        baseUrl: string,
      ): InviteUser =>
        new InviteUser(
          userRepository,
          passwordHasher,
          emailSender,
          clock,
          idGenerator,
          auditLogger,
          baseUrl,
        ),
    },
    {
      provide: 'ACCEPT_INVITE_USE_CASE',
      inject: ['USER_REPOSITORY', 'PASSWORD_HASHER', 'CLOCK'],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        clock: Clock,
      ): AcceptInvite => new AcceptInvite(userRepository, passwordHasher, clock),
    },
    {
      provide: 'UPDATE_USER_USE_CASE',
      inject: ['USER_REPOSITORY', 'AUDIT_LOGGER', 'CLOCK'],
      useFactory: (
        userRepository: UserRepository,
        auditLogger: AuditLogger,
        clock: Clock,
      ): UpdateUser => new UpdateUser(userRepository, auditLogger, clock),
    },
    {
      provide: 'DEACTIVATE_USER_USE_CASE',
      inject: ['USER_REPOSITORY', 'AUDIT_LOGGER', 'CLOCK'],
      useFactory: (
        userRepository: UserRepository,
        auditLogger: AuditLogger,
        clock: Clock,
      ): DeactivateUser => new DeactivateUser(userRepository, auditLogger, clock),
    },
  ],
  exports: ['ACCEPT_INVITE_USE_CASE'],
})
export class UsersModule {}
