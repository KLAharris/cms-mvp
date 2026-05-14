import { describe, expect, it, vi } from 'vitest';

import { ContentVersion } from '../../../domain/entities/content-version.entity';
import { ContentId } from '../../../domain/value-objects/content-id.vo';
import { RichTextBody } from '../../../domain/value-objects/rich-text-body.vo';
import { SeoMetadata } from '../../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../../domain/value-objects/slug.vo';
import { Tag } from '../../../domain/value-objects/tag.vo';
import { PrismaContentVersionRepository } from './prisma-content-version.repository';

const CONTENT_ID = ContentId.create('550e8400-e29b-41d4-a716-446655440000');
const NOW = new Date('2026-06-01T00:00:00Z');

function makeVersion(): ContentVersion {
  return ContentVersion.create({
    id: '550e8400-e29b-41d4-a716-446655440001',
    contentId: CONTENT_ID,
    versionNo: 2,
    snapshot: {
      title: 'Title',
      slug: Slug.create('title'),
      body: RichTextBody.create({ type: 'doc' }),
      featuredImageId: null,
      socialImageId: null,
      seoMetadata: SeoMetadata.create('Seo', 'Description'),
      tags: [Tag.create('tech')],
      category: null,
      parentId: null,
      scheduledAt: null,
    },
    editorId: '550e8400-e29b-41d4-a716-446655440002',
    createdAt: NOW,
  });
}

function makePrisma(version: ContentVersion) {
  const row = {
    id: version.id,
    contentId: version.contentId.value,
    versionNo: version.versionNo,
    snapshot: {
      title: 'Title',
      slug: 'title',
      body: { type: 'doc' },
      featuredImageId: null,
      socialImageId: null,
      seoMetadata: { title: 'Seo', description: 'Description' },
      tags: ['tech'],
      category: null,
      parentId: null,
      scheduledAt: null,
    },
    editorId: version.editorId,
    createdAt: version.createdAt,
  };

  return {
    prisma: {
      contentVersion: {
        upsert: vi.fn().mockResolvedValue(row),
        findMany: vi.fn().mockResolvedValue([row]),
        findUnique: vi.fn().mockResolvedValueOnce(row).mockResolvedValueOnce(null),
        count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(0),
      },
    },
  };
}

describe('PrismaContentVersionRepository', () => {
  it('saves, lists, finds, and calculates the next version number', async () => {
    const version = makeVersion();
    const { prisma } = makePrisma(version);
    const repository = new PrismaContentVersionRepository(prisma);

    await repository.save(version);
    await expect(repository.findByContentId(CONTENT_ID)).resolves.toEqual([version]);
    await expect(repository.findByVersionNo(CONTENT_ID, 2)).resolves.toEqual(version);
    await expect(repository.findByVersionNo(CONTENT_ID, 99)).resolves.toBeNull();
    await expect(repository.nextVersionNo(CONTENT_ID)).resolves.toBe(3);
    await expect(repository.nextVersionNo(CONTENT_ID)).resolves.toBe(1);

    expect(prisma.contentVersion.upsert).toHaveBeenCalledWith({
      where: {
        contentId_versionNo: {
          contentId: CONTENT_ID.value,
          versionNo: 2,
        },
      },
      create: expect.objectContaining({ contentId: CONTENT_ID.value, versionNo: 2 }),
      update: expect.objectContaining({ contentId: CONTENT_ID.value, versionNo: 2 }),
    });
    expect(prisma.contentVersion.findMany).toHaveBeenCalledWith({
      where: { contentId: CONTENT_ID.value },
      orderBy: { versionNo: 'desc' },
    });
    expect(prisma.contentVersion.findUnique).toHaveBeenCalledWith({
      where: {
        contentId_versionNo: {
          contentId: CONTENT_ID.value,
          versionNo: 2,
        },
      },
    });
    expect(prisma.contentVersion.count).toHaveBeenCalledWith({
      where: { contentId: CONTENT_ID.value },
    });
  });

  it('surfaces Prisma count errors when calculating the next version number', async () => {
    const version = makeVersion();
    const prisma = {
      contentVersion: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn().mockRejectedValue(new Error('count failed')),
      },
    };
    const repository = new PrismaContentVersionRepository(prisma);

    await expect(repository.nextVersionNo(version.contentId)).rejects.toThrow('count failed');
  });
});
