import { describe, expect, it, vi } from 'vitest';

import { Content } from '../../../domain/entities/content.entity';
import { ContentId } from '../../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';
import { RichTextBody } from '../../../domain/value-objects/rich-text-body.vo';
import { SeoMetadata } from '../../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../../domain/value-objects/slug.vo';
import { Tag } from '../../../domain/value-objects/tag.vo';
import { PrismaContentRepository } from './prisma-content.repository';

const ID = '550e8400-e29b-41d4-a716-446655440000';
const AUTHOR_ID = '550e8400-e29b-41d4-a716-446655440001';
const NOW = new Date('2026-06-01T00:00:00Z');

function makeContent(): Content {
  return Content.reconstitute({
    id: ContentId.create(ID),
    type: ContentType.Article,
    title: 'Title',
    slug: Slug.create('title'),
    body: RichTextBody.create({ type: 'doc' }),
    status: ContentStatus.Draft,
    authorId: AUTHOR_ID,
    featuredImageId: null,
    socialImageId: null,
    seoMetadata: SeoMetadata.create('Seo', 'Description'),
    tags: [Tag.create('tech')],
    category: 'news',
    parentId: null,
    scheduledAt: null,
    publishedAt: null,
    deletedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function makePrisma(content: Content) {
  const row = {
    id: content.id.value,
    type: content.type,
    title: content.title,
    slug: content.slug.value,
    body: content.body?.nodes ?? null,
    status: content.status,
    authorId: content.authorId,
    featuredImageId: content.featuredImageId,
    socialImageId: content.socialImageId,
    seoTitle: content.seoMetadata.title,
    seoDescription: content.seoMetadata.description,
    tags: content.tags.map((tag) => tag.value),
    category: content.category,
    parentId: content.parentId,
    scheduledAt: content.scheduledAt,
    publishedAt: content.publishedAt,
    deletedAt: content.deletedAt,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  };

  return {
    row,
    prisma: {
      content: {
        upsert: vi.fn().mockResolvedValue(row),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(row)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(row)
          .mockResolvedValueOnce(null),
        findMany: vi.fn().mockResolvedValue([row]),
        count: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(row),
      },
    },
  };
}

describe('PrismaContentRepository', () => {
  it('saves, finds, lists, and deletes through Prisma', async () => {
    const content = makeContent();
    const { prisma } = makePrisma(content);
    const repository = new PrismaContentRepository(prisma);

    await repository.save(content);
    await expect(repository.findById(content.id)).resolves.toEqual(content);
    await expect(repository.findById(content.id)).resolves.toBeNull();
    await expect(repository.findBySlug(ContentType.Article, content.slug)).resolves.toEqual(content);
    await expect(repository.findBySlug(ContentType.Article, content.slug)).resolves.toBeNull();

    const page = await repository.findMany({
      status: ContentStatus.Draft,
      type: ContentType.Article,
      authorId: AUTHOR_ID,
      tag: 'tech',
      titleSearch: 'tit',
      dateFrom: NOW,
      dateTo: NOW,
      page: 1,
      pageSize: 25,
    });

    await repository.delete(content.id);

    expect(page).toEqual({
      items: [content],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });
    expect(prisma.content.upsert).toHaveBeenCalledWith({
      where: { id: ID },
      create: expect.objectContaining({ id: ID }),
      update: expect.objectContaining({ id: ID }),
    });
    expect(prisma.content.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: ContentStatus.Draft,
        type: ContentType.Article,
        authorId: AUTHOR_ID,
        tags: { has: 'tech' },
        title: { contains: 'tit', mode: 'insensitive' },
        createdAt: { gte: NOW, lte: NOW },
      },
      skip: 0,
      take: 25,
      orderBy: { updatedAt: 'desc' },
    });
    expect(prisma.content.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it('builds minimal findMany criteria when optional filters are absent', async () => {
    const content = makeContent();
    const { prisma } = makePrisma(content);
    const repository = new PrismaContentRepository(prisma);

    await repository.findMany({ page: 2, pageSize: 10 });

    expect(prisma.content.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      skip: 10,
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });
  });

  it('builds one-sided date filters', async () => {
    const content = makeContent();
    const { prisma } = makePrisma(content);
    const repository = new PrismaContentRepository(prisma);

    await repository.findMany({ dateFrom: NOW, page: 1, pageSize: 10 });
    await repository.findMany({ dateTo: NOW, page: 1, pageSize: 10 });

    expect(prisma.content.findMany).toHaveBeenNthCalledWith(1, {
      where: { deletedAt: null, createdAt: { gte: NOW } },
      skip: 0,
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });
    expect(prisma.content.findMany).toHaveBeenNthCalledWith(2, {
      where: { deletedAt: null, createdAt: { lte: NOW } },
      skip: 0,
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });
  });
});
