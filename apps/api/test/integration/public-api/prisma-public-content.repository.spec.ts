import { Prisma, PrismaClient, Role, UserStatus } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaPublicContentRepository } from '../../../src/modules/public-api/adapters/out/persistence/prisma-public-content.repository';
import type { PrismaService } from '../../../src/shared/prisma/prisma.service';

const apiRoot = resolve(__dirname, '../../..');
loadEnv({ path: resolve(apiRoot, '.env') });

const hasDatabase = process.env.TEST_DATABASE_URL !== undefined;
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe.skipIf(!hasDatabase)('PrismaPublicContentRepository', () => {
  let prisma: PrismaClient;
  let repo: PrismaPublicContentRepository;

  beforeAll(async () => {
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
    const config = {
      get: (key: string, fallback = '') =>
        key === 'OBJECT_STORAGE_ENDPOINT' ? 'http://localhost:9000' : fallback,
    };
    repo = new PrismaPublicContentRepository(
      prisma as unknown as PrismaService,
      config as never,
    );
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('listPublishedArticles returns only published articles', async () => {
    const user = await seedUser(prisma);
    await seedContent(prisma, user.id, { slug: 'published' });
    await seedContent(prisma, user.id, { slug: 'draft', status: 'draft' });

    const result = await repo.listPublishedArticles({ page: 1, pageSize: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.slug).toBe('published');
  }, 30000);

  it('listPublishedArticles excludes future-dated articles (FR-PUBAPI-03)', async () => {
    const user = await seedUser(prisma);
    await seedContent(prisma, user.id, {
      slug: 'future',
      publishedAt: new Date(Date.now() + 86_400_000),
    });

    const result = await repo.listPublishedArticles({ page: 1, pageSize: 10 });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('listPublishedArticles returns correct pagination metadata', async () => {
    const user = await seedUser(prisma);
    await seedContent(prisma, user.id, { slug: 'one' });
    await seedContent(prisma, user.id, { slug: 'two' });
    await seedContent(prisma, user.id, { slug: 'three' });

    const result = await repo.listPublishedArticles({ page: 1, pageSize: 2 });

    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.data).toHaveLength(2);
  });

  it('getPublishedArticleBySlug returns article with seo fields', async () => {
    const user = await seedUser(prisma);
    await seedContent(prisma, user.id, {
      slug: 'article',
      seoTitle: 'SEO title',
      seoDescription: 'SEO description',
    });

    const article = await repo.getPublishedArticleBySlug('article');

    expect(article?.seo.seoTitle).toBe('SEO title');
    expect(article?.seo.seoDescription).toBe('SEO description');
  });

  it('getPublishedArticleBySlug returns null for a draft article (FR-AUTHZ-06)', async () => {
    const user = await seedUser(prisma);
    await seedContent(prisma, user.id, { slug: 'draft', status: 'draft' });

    await expect(repo.getPublishedArticleBySlug('draft')).resolves.toBeNull();
  });

  it('getPublishedArticleBySlug returns null for unknown slug', async () => {
    await expect(repo.getPublishedArticleBySlug('missing')).resolves.toBeNull();
  });

  it('listPublishedPages returns only published pages', async () => {
    const user = await seedUser(prisma);
    await seedContent(prisma, user.id, { slug: 'published-page', type: 'page' });
    await seedContent(prisma, user.id, {
      slug: 'draft-page',
      type: 'page',
      status: 'draft',
    });

    const result = await repo.listPublishedPages({ page: 1, pageSize: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.slug).toBe('published-page');
  });
});

async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.contentVersion.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.contentMediaRef.deleteMany();
  await prisma.content.deleteMany();
  await prisma.mediaItem.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUser(
  prisma: PrismaClient,
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
) {
  return prisma.user.create({
    data: {
      email: `user-${crypto.randomUUID()}@cms.local`,
      name: 'Public Author',
      passwordHash: 'hash',
      role: Role.AUTHOR,
      status: UserStatus.ACTIVE,
      ...overrides,
    },
  });
}

async function seedContent(
  prisma: PrismaClient,
  userId: string,
  overrides: Partial<Prisma.ContentUncheckedCreateInput> = {},
) {
  const data: Prisma.ContentUncheckedCreateInput = {
    type: 'article',
    title: 'Public content',
    slug: `content-${crypto.randomUUID()}`,
    body: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Public body text' }],
        },
      ],
    },
    status: 'published',
    authorId: userId,
    seoTitle: '',
    seoDescription: '',
    tags: [],
    publishedAt: NOW,
    deletedAt: null,
    ...overrides,
  };

  return prisma.content.create({
    data,
  });
}
