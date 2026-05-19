import { Inject, Injectable } from '@nestjs/common';
import { Role as PrismaRole, UserStatus as PrismaUserStatus } from '@prisma/client';

import { PasswordResetUnitOfWork } from '../../application/ports/out/password-reset-unit-of-work.port';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class PrismaPasswordResetUnitOfWork implements PasswordResetUnitOfWork {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resetPassword(user: User, tokenId: string, usedAt: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: user.passwordHash,
          passwordChangedAt: user.passwordChangedAt,
          status: toPrismaUserStatus(user.status),
          role: toPrismaRole(user.role),
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: tokenId },
        data: { usedAt },
      }),
    ]);
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

function toPrismaUserStatus(status: User['status']): PrismaUserStatus {
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
