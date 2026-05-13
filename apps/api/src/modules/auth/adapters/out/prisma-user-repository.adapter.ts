import { Inject, Injectable } from '@nestjs/common';
import {
  Role as PrismaRole,
  User as PrismaUser,
  UserStatus as PrismaUserStatus,
} from '@prisma/client';

import {
  PagedUsers,
  UserRepository,
  UserSearchCriteria,
} from '../../application/ports/out/user-repository.port';
import { Email } from '../../domain/email';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.value },
    });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async findMany(criteria: UserSearchCriteria): Promise<PagedUsers> {
    const page = criteria.page ?? 1;
    const pageSize = criteria.pageSize ?? 20;
    const where = {
      role: criteria.role === undefined ? undefined : toPrismaRole(criteria.role),
      status:
        criteria.status === undefined ? undefined : toPrismaUserStatus(criteria.status),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => PrismaUserMapper.toDomain(user)),
      total,
    };
  }

  async findInvitedByTokenHash(sha256Hash: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        status: PrismaUserStatus.INVITED,
        inviteTokenHash: sha256Hash,
      },
    });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async countByRole(role: Role): Promise<number> {
    return this.prisma.user.count({
      where: { role: toPrismaRole(role) },
    });
  }

  async save(user: User): Promise<void> {
    const data = PrismaUserMapper.toPersistence(user);

    await this.prisma.user.upsert({
      where: { id: user.id },
      create: data,
      update: data,
    });
  }
}

const PrismaUserMapper = {
  toDomain(user: PrismaUser): User {
    return new User({
      id: user.id,
      email: Email.create(user.email),
      name: user.name,
      passwordHash: user.passwordHash,
      role: toDomainRole(user.role),
      status:
        user.lockedUntil !== null && user.lockedUntil > new Date()
          ? 'locked'
          : toDomainUserStatus(user.status),
      failedLoginAttempts: user.failedLoginAttempts,
      failedLoginWindowStartedAt: user.failedLoginWindowStartedAt,
      lockedUntil: user.lockedUntil,
      lastLoginAt: user.lastLoginAt,
      inviteTokenHash: user.inviteTokenHash,
      inviteExpiresAt: user.inviteExpiresAt,
      createdAt: user.createdAt,
    });
  },

  toPersistence(user: User): {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    role: PrismaRole;
    status: PrismaUserStatus;
    lastLoginAt: Date | null;
    failedLoginAttempts: number;
    failedLoginWindowStartedAt: Date | null;
    lockedUntil: Date | null;
    inviteTokenHash: string | null;
    inviteExpiresAt: Date | null;
  } {
    return {
      id: user.id,
      email: user.email.value,
      name: user.name,
      passwordHash: user.passwordHash,
      role: toPrismaRole(user.role),
      status: toPrismaUserStatus(user.status),
      lastLoginAt: user.lastLoginAt,
      failedLoginAttempts: user.failedLoginAttempts,
      failedLoginWindowStartedAt: user.failedLoginWindowStartedAt,
      lockedUntil: user.lockedUntil,
      inviteTokenHash: user.inviteTokenHash,
      inviteExpiresAt: user.inviteExpiresAt,
    };
  },
};

function toDomainRole(role: PrismaRole): Role {
  switch (role) {
    case PrismaRole.ADMIN:
      return Role.ADMIN;
    case PrismaRole.EDITOR:
      return Role.EDITOR;
    case PrismaRole.AUTHOR:
      return Role.AUTHOR;
  }
}

function toPrismaRole(role: Role): PrismaRole {
  switch (role) {
    case Role.ADMIN:
      return PrismaRole.ADMIN;
    case Role.EDITOR:
      return PrismaRole.EDITOR;
    case Role.AUTHOR:
      return PrismaRole.AUTHOR;
  }
}

function toDomainUserStatus(status: PrismaUserStatus): User['status'] {
  switch (status) {
    case PrismaUserStatus.ACTIVE:
      return 'active';
    case PrismaUserStatus.DEACTIVATED:
      return 'deactivated';
    case PrismaUserStatus.INVITED:
      return 'invited';
  }
}

function toPrismaUserStatus(
  status: NonNullable<UserSearchCriteria['status']> | User['status'],
): PrismaUserStatus {
  switch (status) {
    case 'active':
    case 'locked':
      return PrismaUserStatus.ACTIVE;
    case 'deactivated':
      return PrismaUserStatus.DEACTIVATED;
    case 'invited':
      return PrismaUserStatus.INVITED;
  }
}
