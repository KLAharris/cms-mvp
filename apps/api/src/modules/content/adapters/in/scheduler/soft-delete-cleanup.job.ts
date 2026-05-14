import { Cron } from '@nestjs/schedule';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../../shared/prisma/prisma.service';

export type SoftDeleteCleanupPrismaClient = {
  contentVersion: {
    deleteMany(args: Prisma.ContentVersionDeleteManyArgs): Promise<Prisma.BatchPayload>;
  };
  content: {
    deleteMany(args: Prisma.ContentDeleteManyArgs): Promise<Prisma.BatchPayload>;
  };
};

const RETENTION_DAYS = 30;

@Injectable()
export class SoftDeleteCleanupJob {
  private readonly logger = new Logger(SoftDeleteCleanupJob.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: SoftDeleteCleanupPrismaClient,
  ) {}

  @Cron('0 2 * * *', { timeZone: 'UTC' })
  async runOnce(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.contentVersion.deleteMany({
      where: {
        content: {
          deletedAt: { lte: cutoff },
        },
      },
    });

    const result = await this.prisma.content.deleteMany({
      where: {
        deletedAt: { lte: cutoff },
      },
    });

    this.logger.log(
      `Soft-delete cleanup: ${String(result.count)} content items hard-deleted.`,
    );
  }
}
