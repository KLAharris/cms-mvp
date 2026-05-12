import { Inject, Injectable } from '@nestjs/common';
import { Role as PrismaRole, User as PrismaUser } from '@prisma/client';

import { UserRepository } from '../../application/ports/out/user-repository.port';
import { Email } from '../../domain/email';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByEmail(email: Email): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.value },
    });

    return user ? PrismaUserMapper.toDomain(user) : null;
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
      passwordHash: user.passwordHash,
      role: toDomainRole(user.role),
      status: user.lockedUntil !== null && user.lockedUntil > new Date() ? 'locked' : 'active',
      failedLoginAttempts: user.failedLoginAttempts,
      failedLoginWindowStartedAt: user.failedLoginWindowStartedAt,
      lockedUntil: user.lockedUntil,
    });
  },

  toPersistence(user: User): {
    id: string;
    email: string;
    passwordHash: string;
    role: PrismaRole;
    failedLoginAttempts: number;
    failedLoginWindowStartedAt: Date | null;
    lockedUntil: Date | null;
  } {
    return {
      id: user.id,
      email: user.email.value,
      passwordHash: user.passwordHash,
      role: toPrismaRole(user.role),
      failedLoginAttempts: user.failedLoginAttempts,
      failedLoginWindowStartedAt: user.failedLoginWindowStartedAt,
      lockedUntil: user.lockedUntil,
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
