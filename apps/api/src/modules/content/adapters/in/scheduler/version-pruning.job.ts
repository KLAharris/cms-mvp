import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../../shared/prisma/prisma.service';

type VersionCountRow = {
  content_id: string;
  version_count: bigint | number;
};

export type VersionPruningPrismaClient = {
  $queryRaw(
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ): Promise<VersionCountRow[]>;
  contentVersion: {
    findMany(
      args: Prisma.ContentVersionFindManyArgs,
    ): Promise<Array<{ id: string }>>;
    deleteMany(args: Prisma.ContentVersionDeleteManyArgs): Promise<Prisma.BatchPayload>;
  };
};

const VERSION_RETENTION_COUNT = 50;

@Injectable()
export class VersionPruningJob {
  private readonly logger = new Logger(VersionPruningJob.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: VersionPruningPrismaClient,
  ) {}

  @Cron('0 3 * * *', { timeZone: 'UTC' })
  async runOnce(): Promise<void> {
    const rows = await this.prisma.$queryRaw`
      SELECT content_id, COUNT(*) as version_count
      FROM content_version
      GROUP BY content_id
      HAVING COUNT(*) > 50
    `;

    let deletedVersions = 0;
    let affectedItems = 0;

    for (const row of rows) {
      const versionCount = this.toNumber(row.version_count);
      const deleteCount = versionCount - VERSION_RETENTION_COUNT;

      if (deleteCount <= 0) continue;

      const versions = await this.prisma.contentVersion.findMany({
        where: { contentId: row.content_id },
        select: { id: true },
        orderBy: { versionNo: 'asc' },
      });
      const idsToDelete = versions.slice(0, deleteCount).map((version) => version.id);

      if (idsToDelete.length === 0) continue;

      const result = await this.prisma.contentVersion.deleteMany({
        where: { id: { in: idsToDelete } },
      });

      deletedVersions += result.count;
      affectedItems += 1;
    }

    this.logger.log(
      `Version pruning: ${String(deletedVersions)} versions deleted across ${String(affectedItems)} content items.`,
    );
  }

  private toNumber(value: bigint | number): number {
    return typeof value === 'bigint' ? Number(value) : value;
  }
}
