import { Injectable } from '@nestjs/common';
import { MediaItem as PrismaMediaItem, Prisma } from '@prisma/client';

import { PagedResult } from '../../../../../shared/kernel/paged-result';
import {
  FindMediaQuery,
  MediaRepository,
} from '../../../application/ports/out';
import { MediaItem } from '../../../domain/entities';
import { MediaId } from '../../../domain/value-objects';
import { MediaPersistenceMapper } from './media-persistence.mapper';

type PrismaMediaClient = {
  mediaItem: {
    upsert(args: Prisma.MediaItemUpsertArgs): Promise<unknown>;
    findUnique(args: Prisma.MediaItemFindUniqueArgs): Promise<PrismaMediaItem | null>;
    findMany(args: Prisma.MediaItemFindManyArgs): Promise<PrismaMediaItem[]>;
    count(args: Prisma.MediaItemCountArgs): Promise<number>;
    delete(args: Prisma.MediaItemDeleteArgs): Promise<unknown>;
  };
};

@Injectable()
export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly prisma: PrismaMediaClient) {}

  async save(media: MediaItem): Promise<void> {
    const data = MediaPersistenceMapper.toRecord(media);

    await this.prisma.mediaItem.upsert({
      where: { id: media.id.value },
      create: data,
      update: data,
    });
  }

  async findById(id: MediaId): Promise<MediaItem | null> {
    const record = await this.prisma.mediaItem.findUnique({
      where: { id: id.value },
    });

    return record === null ? null : MediaPersistenceMapper.toDomain(record);
  }

  async findAll(query: FindMediaQuery): Promise<PagedResult<MediaItem>> {
    const where: Prisma.MediaItemWhereInput = {
      ...(query.search !== undefined
        ? { filename: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query.uploadedBy !== undefined ? { uploadedBy: query.uploadedBy } : {}),
      ...(query.dateFrom !== undefined || query.dateTo !== undefined
        ? {
            uploadedAt: {
              ...(query.dateFrom !== undefined ? { gte: query.dateFrom } : {}),
              ...(query.dateTo !== undefined ? { lte: query.dateTo } : {}),
            },
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.mediaItem.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { uploadedAt: 'desc' },
      }),
      this.prisma.mediaItem.count({ where }),
    ]);

    return {
      items: records.map((record) => MediaPersistenceMapper.toDomain(record)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async delete(id: MediaId): Promise<void> {
    await this.prisma.mediaItem.delete({ where: { id: id.value } });
  }
}
