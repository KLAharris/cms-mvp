import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getOptionsToken, ThrottlerModule } from '@nestjs/throttler';
import { Prisma, PrismaClient, Role, UserStatus } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createHash } from 'crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { InMemoryCache } from '../../fakes/in-memory-cache';
import { ThrottlerExceptionFilter } from '../../../src/modules/public-api/adapters/in/http/throttler-exception.filter';
import { PrismaPublicContentRepository } from '../../../src/modules/public-api/adapters/out/persistence/prisma-public-content.repository';
import { PublicApiModule } from '../../../src/modules/public-api/public-api.module';
import type {
  PublicArticleDetail,
  PublicArticleSummary,
  PublicPageDetail,
  PublicPageSummary,
} from '../../../src/modules/public-api/application/public-content.read-model';
import { PUBLIC_CONTENT_REPOSITORY } from '../../../src/modules/public-api/application/ports/out/public-content-repository.port';
import { CACHE } from '../../../src/shared/ports/cache.port';

const apiRoot = resolve(__dirname, '../../..');
const NOW = new Date('2026-01-01T00:00:00.000Z');
const apiKeyUserId = 'public-api-key-user';
const publicAuthorId = 'public-api-author';
const primaryApiKeyId = '123e4567-e89b-42d3-a456-426614174001';
const secondaryApiKeyId = '123e4567-e89b-42d3-a456-426614174002';
const originalDatabaseUrl = process.env.DATABASE_URL;
let prisma: PrismaClient;

type ListResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

type ErrorResponse = {
  error: { code: string; message: string };
};

@Catch(ZodError)
class ZodFilter implements ExceptionFilter {
  catch(err: ZodError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<{
      status(code: number): { json(body: unknown): void };
    }>();
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: err.message },
    });
  }
}

describe('PublicApiController integration', () => {
  let app: INestApplication;
  let postgres: StartedPostgreSqlContainer;
  let cache: InMemoryCache;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:16-alpine')
      .withStartupTimeout(120000)
      .start();
    const databaseUrl = postgres.getConnectionUri();

    process.env.DATABASE_URL = databaseUrl;
    process.env.OBJECT_STORAGE_ENDPOINT = 'https://cdn.example.com';
    process.env.OBJECT_STORAGE_BUCKET = 'cms-public';

    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });

    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();
  }, 120000);

  beforeEach(async () => {
    cache = new InMemoryCache();
    await cleanDatabase(prisma);
    await seedUser(apiKeyUserId, 'public-api-key-user@cms.local');
    await seedUser(publicAuthorId, 'public-api-author@cms.local');
    await seedApiKey('test-key', primaryApiKeyId);
    await seedApiKey('different-key', secondaryApiKeyId);

    const module = await Test.createTestingModule({
      imports: [PublicApiModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 3 }])],
    })
      .overrideProvider(getOptionsToken())
      .useValue([{ ttl: 60_000, limit: 3 }])
      .overrideProvider(PUBLIC_CONTENT_REPOSITORY)
      .useValue(
        new PrismaPublicContentRepository(prisma as never, {
          get: (key: string, fallback = '') => process.env[key] ?? fallback,
        } as never),
      )
      .overrideProvider(CACHE)
      .useValue(cache)
      .overrideProvider('REDIS_CLIENT')
      .useValue({})
      .compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new ZodFilter(), new ThrottlerExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    // Close the app before other teardown so BullMQ/ioredis connections finish
    // draining. app.close() in afterEach starts the close but may return before
    // ioredis fully settles; calling it again here is a no-op on the NestJS side
    // but gives the runtime a chance to flush pending close callbacks.
    await app.close().catch(() => undefined);
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    await cleanDatabase(prisma);
    await prisma.$disconnect();
    await postgres.stop();
    restoreDatabaseUrl();
  });

  const api = (path: string) =>
    request(app.getHttpServer()).get(path).set('X-API-Key', 'test-key');

  describe('GET /api/v1/articles', () => {
    it('returns 200 with paginated article list', async () => {
      await seedArticle();

      const res = await api('/api/v1/articles').expect(200);
      const body = res.body as ListResponse<PublicArticleSummary>;

      expect(body.data).toHaveLength(1);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.page_size).toBe(25);
      expect(body.pagination.total).toBe(1);
      expect(body.pagination.total_pages).toBe(1);
    });

    it('returns Cache-Control header', async () => {
      const res = await api('/api/v1/articles').expect(200);

      expect(res.headers['cache-control']).toBe(
        'public, max-age=300, stale-while-revalidate=60',
      );
    });

    it('returns ETag header', async () => {
      const res = await api('/api/v1/articles').expect(200);

      expect(res.headers.etag).toMatch(/^"[a-f0-9]{16}"$/);
    });

    it('returns Last-Modified header when results are present', async () => {
      await seedArticle();

      const res = await api('/api/v1/articles').expect(200);

      expect(res.headers['last-modified']).toBeDefined();
    });

    it('respects page and page_size query params', async () => {
      await seedArticle({ id: '1', slug: 'a' });
      await seedArticle({ id: '2', slug: 'b' });

      const res = await api('/api/v1/articles?page=1&page_size=1').expect(200);
      const body = res.body as ListResponse<PublicArticleSummary>;

      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(2);
      expect(body.pagination.total_pages).toBe(2);
    });

    it('returns 200 with empty data array when no articles exist', async () => {
      const res = await api('/api/v1/articles').expect(200);
      const body = res.body as ListResponse<PublicArticleSummary>;

      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
    });

    it('returns 401 when X-API-Key header is missing', async () => {
      await request(app.getHttpServer()).get('/api/v1/articles').expect(401);
    });

    it('serves from cache on second request', async () => {
      await seedArticle();
      await api('/api/v1/articles').expect(200);

      await deletePublicContent(prisma);
      const res = await api('/api/v1/articles').expect(200);
      const body = res.body as ListResponse<PublicArticleSummary>;

      expect(body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/articles/:slug', () => {
    it('returns 200 with article detail including seo fields', async () => {
      await seedArticle({ seoTitle: 'SEO', seoDescription: 'Desc' });

      const res = await api('/api/v1/articles/test-article').expect(200);
      const body = res.body as PublicArticleDetail;

      expect(body.seo.seoTitle).toBe('SEO');
      expect(body.body).toBeDefined();
    });

    it('returns Cache-Control header', async () => {
      await seedArticle();

      const res = await api('/api/v1/articles/test-article').expect(200);

      expect(res.headers['cache-control']).toBe(
        'public, max-age=600, stale-while-revalidate=60',
      );
    });

    it('returns ETag and Last-Modified headers', async () => {
      await seedArticle();

      const res = await api('/api/v1/articles/test-article').expect(200);

      expect(res.headers.etag).toMatch(/^"[a-f0-9]{16}"$/);
      expect(res.headers['last-modified']).toBeDefined();
    });

    it('returns 404 with correct error envelope for unknown slug', async () => {
      const res = await api('/api/v1/articles/does-not-exist').expect(404);
      const body = res.body as ErrorResponse;

      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Article not found');
    });

    it('serves from cache on second request', async () => {
      await seedArticle();
      await api('/api/v1/articles/test-article').expect(200);

      await deletePublicContent(prisma);
      const res = await api('/api/v1/articles/test-article').expect(200);
      const body = res.body as PublicArticleDetail;

      expect(body.slug).toBe('test-article');
    });
  });

  describe('GET /api/v1/pages', () => {
    it('returns 200 with paginated page list', async () => {
      await seedPage();

      const res = await api('/api/v1/pages').expect(200);
      const body = res.body as ListResponse<PublicPageSummary>;

      expect(body.data).toHaveLength(1);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.page_size).toBe(25);
      expect(body.pagination.total).toBe(1);
      expect(body.pagination.total_pages).toBe(1);
    });

    it('returns Cache-Control header', async () => {
      const res = await api('/api/v1/pages').expect(200);

      expect(res.headers['cache-control']).toBe(
        'public, max-age=300, stale-while-revalidate=60',
      );
    });

    it('returns ETag header', async () => {
      const res = await api('/api/v1/pages').expect(200);

      expect(res.headers.etag).toMatch(/^"[a-f0-9]{16}"$/);
    });

    it('returns 200 with empty data when no pages exist', async () => {
      const res = await api('/api/v1/pages').expect(200);
      const body = res.body as ListResponse<PublicPageSummary>;

      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
    });

    it('returns 401 when X-API-Key header is missing', async () => {
      await request(app.getHttpServer()).get('/api/v1/pages').expect(401);
    });
  });

  describe('GET /api/v1/pages/:slug', () => {
    it('returns 200 with page detail and seo fields', async () => {
      await seedPage({ seoTitle: 'SEO Page', seoDescription: 'Page Desc' });

      const res = await api('/api/v1/pages/test-page').expect(200);
      const body = res.body as PublicPageDetail;

      expect(body.seo.seoTitle).toBe('SEO Page');
      expect(body.body).toBeDefined();
    });

    it('returns Cache-Control header', async () => {
      await seedPage();

      const res = await api('/api/v1/pages/test-page').expect(200);

      expect(res.headers['cache-control']).toBe(
        'public, max-age=600, stale-while-revalidate=60',
      );
    });

    it('returns 404 with correct error envelope for unknown slug', async () => {
      const res = await api('/api/v1/pages/does-not-exist').expect(404);
      const body = res.body as ErrorResponse;

      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Page not found');
    });
  });

  describe('GET /api/v1/media/:id', () => {
    it('returns 200 with media item metadata and variants', async () => {
      await seedMediaItem();

      const res = await api('/api/v1/media/media-1');
      const mediaBody = res.body as {
        id: string;
        filename: string;
        variants: Array<{ key: string }>;
      };
      expect(res.status).toBe(200);
      expect(mediaBody.id).toBe('media-1');
      expect(mediaBody.filename).toBe('photo.jpg');
      expect(mediaBody.variants).toHaveLength(1);
      expect(mediaBody.variants[0]?.key).toBe('original');
    });

    it('returns Cache-Control header', async () => {
      await seedMediaItem();

      const res = await api('/api/v1/media/media-1');

      expect(res.headers['cache-control']).toBe(
        'public, max-age=600, stale-while-revalidate=60',
      );
    });

    it('returns 404 with correct error envelope for unknown id', async () => {
      const res = await api('/api/v1/media/00000000-0000-0000-0000-000000000000');
      const notFoundBody = res.body as { error: { code: string; message: string } };

      expect(res.status).toBe(404);
      expect(notFoundBody.error.code).toBe('NOT_FOUND');
      expect(notFoundBody.error.message).toBe('Media item not found');
    });

    it('returns 401 when X-API-Key header is missing', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/media/media-1');

      expect(res.status).toBe(401);
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 after exceeding the request limit', async () => {
      await seedArticle();

      await api('/api/v1/articles').expect(200);
      await api('/api/v1/articles').expect(200);
      await api('/api/v1/articles').expect(200);
      const res = await api('/api/v1/articles');
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(429);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error.message).toBe(
        'Too many requests. Please retry after 60 seconds.',
      );
    });

    it('counts requests per API key not per IP', async () => {
      await seedArticle();

      await api('/api/v1/articles').expect(200);
      await api('/api/v1/articles').expect(200);
      await api('/api/v1/articles').expect(200);
      await api('/api/v1/articles').expect(429);

      const res = await request(app.getHttpServer())
        .get('/api/v1/articles')
        .set('X-API-Key', 'different-key');

      expect(res.status).toBe(200);
    });
  });

  describe('pagination validation', () => {
    it('returns 400 when page_size exceeds 100', async () => {
      await api('/api/v1/articles?page_size=101').expect(400);
    });

    it('defaults page=1 page_size=25 when no params provided', async () => {
      const res = await api('/api/v1/articles').expect(200);
      const body = res.body as ListResponse<PublicArticleSummary>;

      expect(body.pagination.page).toBe(1);
      expect(body.pagination.page_size).toBe(25);
    });
  });
});

async function cleanDatabase(client: PrismaClient): Promise<void> {
  await client.auditEvent.deleteMany();
  await client.apiKey.deleteMany();
  await client.contentMediaRef.deleteMany();
  await client.contentVersion.deleteMany();
  await client.content.deleteMany();
  await client.mediaItem.deleteMany();
  await client.user.deleteMany();
}

async function deletePublicContent(client: PrismaClient): Promise<void> {
  await client.contentMediaRef.deleteMany();
  await client.contentVersion.deleteMany();
  await client.content.deleteMany();
  await client.mediaItem.deleteMany();
}

async function seedUser(id: string, email: string): Promise<void> {
  await prisma.user.upsert({
    where: { id },
    update: {
      email,
      name: 'Public API User',
      passwordHash: 'hash',
      role: Role.AUTHOR,
      status: UserStatus.ACTIVE,
    },
    create: {
      id,
      email,
      name: 'Public API User',
      passwordHash: 'hash',
      role: Role.AUTHOR,
      status: UserStatus.ACTIVE,
    },
  });
}

async function seedApiKey(rawKey: string, id: string): Promise<void> {
  await prisma.apiKey.upsert({
    where: { id },
    update: {
      name: id,
      keyHash: hashApiKey(rawKey),
      revokedAt: null,
      createdById: apiKeyUserId,
    },
    create: {
      id,
      name: id,
      keyHash: hashApiKey(rawKey),
      revokedAt: null,
      createdById: apiKeyUserId,
      createdAt: NOW,
    },
  });
}

async function seedArticle(
  overrides: Partial<Prisma.ContentUncheckedCreateInput> = {},
): Promise<void> {
  await prisma.content.create({
    data: {
      id: 'article-1',
      type: 'article',
      title: 'Test Article',
      slug: 'test-article',
      body: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Some excerpt' }],
          },
        ],
      },
      status: 'published',
      authorId: publicAuthorId,
      seoTitle: 'SEO',
      seoDescription: 'Desc',
      tags: [],
      category: null,
      publishedAt: NOW,
      deletedAt: null,
      ...overrides,
    },
  });
}

async function seedPage(
  overrides: Partial<Prisma.ContentUncheckedCreateInput> = {},
): Promise<void> {
  await prisma.content.create({
    data: {
      id: 'page-1',
      type: 'page',
      title: 'Test Page',
      slug: 'test-page',
      body: { type: 'doc', content: [] },
      status: 'published',
      authorId: publicAuthorId,
      seoTitle: 'SEO Page',
      seoDescription: 'Page Desc',
      tags: [],
      publishedAt: NOW,
      deletedAt: null,
      ...overrides,
    },
  });
}

async function seedMediaItem(): Promise<void> {
  await prisma.mediaItem.create({
    data: {
      id: 'media-1',
      storageKey: 'photo.jpg',
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 102400n,
      width: 1920,
      height: 1080,
      altText: 'A photo',
      caption: null,
      status: 'ready',
      uploadedBy: publicAuthorId,
      uploadedAt: NOW,
      variants: {
        original: {
          key: 'photo.jpg',
          w: 1920,
          h: 1080,
          size: 102400,
          mimeType: 'image/jpeg',
        },
      },
    },
  });
}

function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function restoreDatabaseUrl(): void {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
    return;
  }

  process.env.DATABASE_URL = originalDatabaseUrl;
}
