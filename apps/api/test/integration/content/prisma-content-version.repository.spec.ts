import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaContentRepository } from '../../../src/modules/content/adapters/out/persistence/prisma-content.repository';
import { PrismaContentVersionRepository } from '../../../src/modules/content/adapters/out/persistence/prisma-content-version.repository';
import { Content } from '../../../src/modules/content/domain/entities/content.entity';
import { ContentVersion } from '../../../src/modules/content/domain/entities/content-version.entity';
import { ContentId } from '../../../src/modules/content/domain/value-objects/content-id.vo';
import { ContentType } from '../../../src/modules/content/domain/value-objects/content-type.vo';
import { SeoMetadata } from '../../../src/modules/content/domain/value-objects/seo-metadata.vo';
import { Slug } from '../../../src/modules/content/domain/value-objects/slug.vo';

const apiRoot = resolve(__dirname, '../../..');
loadEnv({ path: resolve(apiRoot, '.env') });

const hasDatabase = process.env.TEST_DATABASE_URL !== undefined;
const NOW = new Date('2026-06-01T00:00:00.000Z');
const CONTENT_ID = '123e4567-e89b-42d3-a456-426614174000';

describe.skipIf(!hasDatabase)('PrismaContentVersionRepository', () => {
  let prisma: PrismaClient;
  let contents: PrismaContentRepository;
  let versions: PrismaContentVersionRepository;

  beforeAll(() => {
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } },
    });
    contents = new PrismaContentRepository(prisma);
    versions = new PrismaContentVersionRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.contentVersion.deleteMany();
    await prisma.content.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: {
        id: 'author-1',
        email: 'author@cms.local',
        name: 'Author',
        passwordHash: 'hash',
        role: Role.AUTHOR,
        status: UserStatus.ACTIVE,
      },
    });
    await contents.save(
      Content.create({
        id: ContentId.create(CONTENT_ID),
        type: ContentType.Article,
        title: 'Title',
        slug: Slug.create('title'),
        authorId: 'author-1',
        seoMetadata: SeoMetadata.create('', ''),
        createdAt: NOW,
      }),
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function version(versionNo: number): ContentVersion {
    return ContentVersion.create({
      id: `version-${String(versionNo)}`,
      contentId: ContentId.create(CONTENT_ID),
      versionNo,
      snapshot: {
        title: `Version ${String(versionNo)}`,
        slug: Slug.create(`version-${String(versionNo)}`),
        body: null,
        featuredImageId: null,
        socialImageId: null,
        seoMetadata: SeoMetadata.create('', ''),
        tags: [],
        category: null,
        parentId: null,
        scheduledAt: null,
      },
      editorId: 'author-1',
      createdAt: new Date(NOW.getTime() + versionNo),
    });
  }

  it('saves, lists, finds, calculates next version, and enforces uniqueness', async () => {
    expect(await versions.nextVersionNo(ContentId.create(CONTENT_ID))).toBe(1);
    await versions.save(version(1));
    await versions.save(version(2));

    expect((await versions.findByContentId(ContentId.create(CONTENT_ID))).map((row) => row.versionNo)).toEqual([2, 1]);
    expect((await versions.findByVersionNo(ContentId.create(CONTENT_ID), 1))?.versionNo).toBe(1);
    expect(await versions.findByVersionNo(ContentId.create(CONTENT_ID), 99)).toBeNull();
    expect(await versions.nextVersionNo(ContentId.create(CONTENT_ID))).toBe(3);

    await expect(prisma.contentVersion.create({
      data: {
        id: 'duplicate-version',
        contentId: CONTENT_ID,
        versionNo: 1,
        snapshot: {},
        editorId: 'author-1',
      },
    })).rejects.toThrow();
  });
});
