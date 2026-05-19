import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaContentRepository } from '../../../src/modules/content/adapters/out/persistence/prisma-content.repository';
import { ContentPersistenceMapper } from '../../../src/modules/content/adapters/out/persistence/content-persistence.mapper';
import { Content } from '../../../src/modules/content/domain/entities/content.entity';
import { ContentId } from '../../../src/modules/content/domain/value-objects/content-id.vo';
import { ContentStatus } from '../../../src/modules/content/domain/value-objects/content-status.vo';
import { ContentType } from '../../../src/modules/content/domain/value-objects/content-type.vo';
import { RichTextBody } from '../../../src/modules/content/domain/value-objects/rich-text-body.vo';
import { SeoMetadata } from '../../../src/modules/content/domain/value-objects/seo-metadata.vo';
import { Slug } from '../../../src/modules/content/domain/value-objects/slug.vo';
import { Tag } from '../../../src/modules/content/domain/value-objects/tag.vo';

const apiRoot = resolve(__dirname, '../../..');
loadEnv({ path: resolve(apiRoot, '.env') });

const hasDatabase = process.env.TEST_DATABASE_URL !== undefined;
const NOW = new Date('2026-06-01T00:00:00.000Z');
const IDS: [string, string, string] = [
  '123e4567-e89b-42d3-a456-426614174000',
  '223e4567-e89b-42d3-a456-426614174000',
  '323e4567-e89b-42d3-a456-426614174000',
];
const FEATURED_IMAGE_ID = '11111111-1111-4111-8111-111111111111';
const SOCIAL_IMAGE_ID = '22222222-2222-4222-8222-222222222222';

describe.skipIf(!hasDatabase)('PrismaContentRepository', () => {
  let prisma: PrismaClient;
  let repository: PrismaContentRepository;

  beforeAll(() => {
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: apiRoot,
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL,
      },
      stdio: 'pipe',
    });
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } },
    });
    repository = new PrismaContentRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.contentVersion.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.contentMediaRef.deleteMany();
    await prisma.content.deleteMany();
    await prisma.mediaItem.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.upsert({
      where: { id: 'author-1' },
      update: {
        email: 'author1@cms.local',
        name: 'Author One',
        passwordHash: 'hash',
        role: Role.AUTHOR,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: 'author-1',
        email: 'author1@cms.local',
        name: 'Author One',
        passwordHash: 'hash',
        role: Role.AUTHOR,
        status: UserStatus.ACTIVE,
      },
    });
    await prisma.user.upsert({
      where: { id: 'author-2' },
      update: {
        email: 'author2@cms.local',
        name: 'Author Two',
        passwordHash: 'hash',
        role: Role.AUTHOR,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: 'author-2',
        email: 'author2@cms.local',
        name: 'Author Two',
        passwordHash: 'hash',
        role: Role.AUTHOR,
        status: UserStatus.ACTIVE,
      },
    });
    await prisma.mediaItem.createMany({
      data: [
        {
          id: FEATURED_IMAGE_ID,
          storageKey: 'content-test/featured.jpg',
          filename: 'featured.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1000n,
          status: 'ready',
          uploadedBy: 'author-1',
          uploadedAt: NOW,
        },
        {
          id: SOCIAL_IMAGE_ID,
          storageKey: 'content-test/social.jpg',
          filename: 'social.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1000n,
          status: 'ready',
          uploadedBy: 'author-1',
          uploadedAt: NOW,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function makeContent(
    id = IDS[0],
    title = 'Title',
    authorId = 'author-1',
    status = ContentStatus.Draft,
    deletedAt: Date | null = null,
  ): Content {
    return Content.reconstitute({
      id: ContentId.create(id),
      type: ContentType.Article,
      title,
      slug: Slug.fromTitle(title),
      body: RichTextBody.create({ type: 'doc' }),
      status,
      authorId,
      featuredImageId: FEATURED_IMAGE_ID,
      socialImageId: SOCIAL_IMAGE_ID,
      seoMetadata: SeoMetadata.create('SEO', 'Description'),
      tags: [Tag.create('tech')],
      category: 'News',
      parentId: null,
      scheduledAt: null,
      publishedAt: status === ContentStatus.Published ? NOW : null,
      deletedAt,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  it('save(), findById(), update upsert, findBySlug(), mapper, and delete round-trip content', async () => {
    const content = makeContent();
    await repository.save(content);

    const found = await repository.findById(content.id);
    expect(found?.title).toBe('Title');
    expect(found?.body?.nodes).toEqual({ type: 'doc' });
    expect(await repository.findBySlug(ContentType.Article, content.slug)).not.toBeNull();
    expect(await repository.findBySlug(ContentType.Article, Slug.create('missing'))).toBeNull();

    content.update({ title: 'Updated' }, new Date('2026-06-02T00:00:00.000Z'));
    await repository.save(content);
    expect((await repository.findById(content.id))?.title).toBe('Updated');

    const persistence = ContentPersistenceMapper.toPersistence(content);
    expect(
      ContentPersistenceMapper.toDomain({
        id: persistence.id ?? IDS[0],
        type: ContentType.Article,
        title: persistence.title,
        slug: persistence.slug,
        body: { type: 'doc' },
        status: ContentStatus.Draft,
        authorId: persistence.authorId,
        featuredImageId: persistence.featuredImageId ?? null,
        socialImageId: persistence.socialImageId ?? null,
        seoTitle: persistence.seoTitle ?? '',
        seoDescription: persistence.seoDescription ?? '',
        tags: ['tech'],
        category: persistence.category ?? null,
        parentId: persistence.parentId ?? null,
        scheduledAt: null,
        publishedAt: null,
        deletedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      }).slug.value,
    ).toBe('title');

    await repository.delete(content.id);
    expect(await repository.findById(content.id)).toBeNull();
  });

  it('findMany filters, paginates, excludes soft-deleted rows, and enforces slug uniqueness', async () => {
    await repository.save(makeContent(IDS[0], 'Alpha Title', 'author-1', ContentStatus.Draft));
    await repository.save(makeContent(IDS[1], 'Beta Title', 'author-2', ContentStatus.Published));
    await repository.save(makeContent(IDS[2], 'Deleted Title', 'author-1', ContentStatus.Draft, NOW));

    await expect(repository.findMany({ status: ContentStatus.Draft, page: 1, pageSize: 10 })).resolves.toMatchObject({ total: 1 });
    await expect(repository.findMany({ authorId: 'author-2', page: 1, pageSize: 10 })).resolves.toMatchObject({ total: 1 });
    await expect(repository.findMany({ titleSearch: 'beta', page: 1, pageSize: 10 })).resolves.toMatchObject({ total: 1 });
    await expect(repository.findMany({ tag: 'tech', page: 1, pageSize: 1 })).resolves.toMatchObject({ total: 2, totalPages: 2 });

    await expect(
      repository.save(makeContent('423e4567-e89b-42d3-a456-426614174000', 'Alpha Title')),
    ).rejects.toThrow();
  }, 30000);
});
