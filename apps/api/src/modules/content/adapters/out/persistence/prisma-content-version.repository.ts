import { Injectable } from '@nestjs/common';
import { ContentVersion as PrismaContentVersion, Prisma } from '@prisma/client';

import { ContentVersionRepository } from '../../../application/ports/out/content-version-repository.port';
import { ContentVersion } from '../../../domain/entities/content-version.entity';
import { ContentId } from '../../../domain/value-objects/content-id.vo';
import { ContentVersionPersistenceMapper } from './content-persistence.mapper';

type PrismaContentVersionClient = {
  contentVersion: {
    upsert(args: Prisma.ContentVersionUpsertArgs): Promise<unknown>;
    findMany(args: Prisma.ContentVersionFindManyArgs): Promise<PrismaContentVersion[]>;
    findUnique(
      args: Prisma.ContentVersionFindUniqueArgs,
    ): Promise<PrismaContentVersion | null>;
    count(args: Prisma.ContentVersionCountArgs): Promise<number>;
  };
};

@Injectable()
export class PrismaContentVersionRepository implements ContentVersionRepository {
  constructor(private readonly prisma: PrismaContentVersionClient) {}

  async save(version: ContentVersion): Promise<void> {
    const data = ContentVersionPersistenceMapper.toPersistence(version);

    await this.prisma.contentVersion.upsert({
      where: {
        contentId_versionNo: {
          contentId: data.contentId,
          versionNo: data.versionNo,
        },
      },
      create: data,
      update: data,
    });
  }

  async findByContentId(contentId: ContentId): Promise<ContentVersion[]> {
    const rows = await this.prisma.contentVersion.findMany({
      where: { contentId: contentId.value },
      orderBy: { versionNo: 'desc' },
    });

    return rows.map((row) => ContentVersionPersistenceMapper.toDomain(row));
  }

  async findByVersionNo(
    contentId: ContentId,
    versionNo: number,
  ): Promise<ContentVersion | null> {
    const row = await this.prisma.contentVersion.findUnique({
      where: {
        contentId_versionNo: {
          contentId: contentId.value,
          versionNo,
        },
      },
    });

    return row === null ? null : ContentVersionPersistenceMapper.toDomain(row);
  }

  async nextVersionNo(contentId: ContentId): Promise<number> {
    return this.prisma.contentVersion.count({
      where: { contentId: contentId.value },
    }).then((total) => total + 1);
  }
}
