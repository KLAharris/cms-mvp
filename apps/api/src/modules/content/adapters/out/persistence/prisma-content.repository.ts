import { Injectable } from '@nestjs/common';
import { Content as PrismaContent, Prisma } from '@prisma/client';

import { ContentRepository, ContentSearchCriteria, PagedResult } from '../../../application/ports/out/content-repository.port';
import { Content } from '../../../domain/entities/content.entity';
import { ContentId } from '../../../domain/value-objects/content-id.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';
import { Slug } from '../../../domain/value-objects/slug.vo';
import { ContentPersistenceMapper } from './content-persistence.mapper';

type PrismaContentClient = {
  content: {
    upsert(args: Prisma.ContentUpsertArgs): Promise<unknown>;
    findUnique(args: Prisma.ContentFindUniqueArgs): Promise<PrismaContent | null>;
    findMany(args: Prisma.ContentFindManyArgs): Promise<PrismaContent[]>;
    count(args: Prisma.ContentCountArgs): Promise<number>;
    delete(args: Prisma.ContentDeleteArgs): Promise<unknown>;
  };
};

@Injectable()
export class PrismaContentRepository implements ContentRepository {
  constructor(private readonly prisma: PrismaContentClient) {}

  async save(content: Content): Promise<void> {
    const data = ContentPersistenceMapper.toPersistence(content);

    await this.prisma.content.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findById(id: ContentId): Promise<Content | null> {
    const row = await this.prisma.content.findUnique({
      where: { id: id.value },
    });

    return row === null ? null : ContentPersistenceMapper.toDomain(row);
  }

  async findBySlug(type: ContentType, slug: Slug): Promise<Content | null> {
    const row = await this.prisma.content.findUnique({
      where: { type_slug: { type, slug: slug.value } },
    });

    return row === null ? null : ContentPersistenceMapper.toDomain(row);
  }

  async findMany(criteria: ContentSearchCriteria): Promise<PagedResult<Content>> {
    const where: Prisma.ContentWhereInput = {
      deletedAt: null,
      ...(criteria.status !== undefined ? { status: criteria.status } : {}),
      ...(criteria.type !== undefined ? { type: criteria.type } : {}),
      ...(criteria.authorId !== undefined ? { authorId: criteria.authorId } : {}),
      ...(criteria.tag !== undefined ? { tags: { has: criteria.tag } } : {}),
      ...(criteria.titleSearch !== undefined
        ? { title: { contains: criteria.titleSearch, mode: 'insensitive' } }
        : {}),
      ...(criteria.dateFrom !== undefined || criteria.dateTo !== undefined
        ? {
            createdAt: {
              ...(criteria.dateFrom !== undefined ? { gte: criteria.dateFrom } : {}),
              ...(criteria.dateTo !== undefined ? { lte: criteria.dateTo } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      items: rows.map((row) => ContentPersistenceMapper.toDomain(row)),
      total,
      page: criteria.page,
      pageSize: criteria.pageSize,
      totalPages: Math.ceil(total / criteria.pageSize),
    };
  }

  async delete(id: ContentId): Promise<void> {
    await this.prisma.content.delete({ where: { id: id.value } });
  }
}
