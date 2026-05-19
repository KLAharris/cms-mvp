import { Inject, Injectable } from '@nestjs/common';
import { PasswordResetToken as PrismaPasswordResetToken } from '@prisma/client';

import { PasswordResetTokenPort } from '../../application/ports/out/password-reset-token.port';
import { PasswordResetToken } from '../../domain/password-reset-token';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(token: PasswordResetToken): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: {
        id: token.id,
        tokenHash: token.tokenHash,
        userId: token.userId,
        expiresAt: token.expiresAt,
        usedAt: token.usedAt,
        createdAt: token.createdAt,
      },
    });
  }

  async findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    return token ? toDomain(token) : null;
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt },
    });
  }
}

function toDomain(token: PrismaPasswordResetToken): PasswordResetToken {
  return new PasswordResetToken({
    id: token.id,
    tokenHash: token.tokenHash,
    userId: token.userId,
    expiresAt: token.expiresAt,
    usedAt: token.usedAt,
    createdAt: token.createdAt,
  });
}
