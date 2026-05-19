import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule, NotificationService } from '../notification';
import { UsersController } from './adapters/in/http/users.controller';
import { UuidIdGenerator } from './adapters/out/uuid-id-generator.adapter';
import { AuditLogger } from './application/ports/out/audit-logger.port';
import { Clock } from './application/ports/out/clock.port';
import { IdGenerator } from './application/ports/out/id-generator.port';
import { PasswordHasher } from './application/ports/out/password-hasher.port';
import { UserRepository } from './application/ports/out/user-repository.port';
import { AcceptInvite } from './application/use-cases/accept-invite.use-case';
import { DeactivateUser } from './application/use-cases/deactivate-user.use-case';
import { InviteUser } from './application/use-cases/invite-user.use-case';
import { ListUsers } from './application/use-cases/list-users.use-case';
import { UpdateUser } from './application/use-cases/update-user.use-case';

@Module({
  imports: [
    forwardRef(() => AuditModule),
    forwardRef(() => AuthModule),
    ConfigModule,
    NotificationModule,
    PrismaModule,
  ],
  controllers: [UsersController],
  providers: [
    JwtAuthGuard,
    {
      provide: 'ID_GENERATOR',
      useClass: UuidIdGenerator,
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
        NotificationService,
        'CLOCK',
        'ID_GENERATOR',
        'AUDIT_LOGGER',
      ],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        notifications: NotificationService,
        clock: Clock,
        idGenerator: IdGenerator,
        auditLogger: AuditLogger,
      ): InviteUser =>
        new InviteUser(
          userRepository,
          passwordHasher,
          notifications,
          clock,
          idGenerator,
          auditLogger,
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
