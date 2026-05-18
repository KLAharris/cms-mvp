import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getOptionsToken, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { InMemoryCache } from '../../fakes/in-memory-cache';
import { InMemoryPublicContentRepository } from '../../fakes/in-memory-public-content.repository';
import { LOOKUP_API_KEY } from '../../../src/modules/api-keys/application/ports/tokens';
import { ThrottlerExceptionFilter } from '../../../src/modules/public-api/adapters/in/http/throttler-exception.filter';
import { PublicApiModule } from '../../../src/modules/public-api/public-api.module';
import type {
  PublicArticleDetail,
  PublicArticleSummary,
  PublicPageDetail,
  PublicPageSummary,
} from '../../../src/modules/public-api/application/public-content.read-model';
import type { PublicMediaItem } from '../../../src/modules/public-api/application/ports/out/public-content-repository.port';
import { PUBLIC_CONTENT_REPOSITORY } from '../../../src/modules/public-api/application/ports/out/public-content-repository.port';
import { CACHE } from '../../../src/shared/ports/cache.port';

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
  let contentRepo: InMemoryPublicContentRepository;
  let cache: InMemoryCache;

  beforeEach(async () => {
    contentRepo = new InMemoryPublicContentRepository();
    cache = new InMemoryCache();

    const module = await Test.createTestingModule({
      imports: [PublicApiModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 3 }])],
    })
      .overrideProvider(getOptionsToken())
      .useValue([{ ttl: 60_000, limit: 3 }])
      .overrideProvider(PUBLIC_CONTENT_REPOSITORY)
      .useValue(contentRepo)
      .overrideProvider(CACHE)
      .useValue(cache)
      .overrideProvider(LOOKUP_API_KEY)
      .useValue({ execute: () => ({ id: 'key-1', name: 'test' }) })
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

  const api = (path: string) =>
    request(app.getHttpServer()).get(path).set('X-API-Key', 'test-key');

  describe('GET /api/v1/articles', () => {
    it('returns 200 with paginated article list', async () => {
      contentRepo.seed([anArticle()]);

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
      contentRepo.seed([anArticle()]);

      const res = await api('/api/v1/articles').expect(200);

      expect(res.headers['last-modified']).toBeDefined();
    });

    it('respects page and page_size query params', async () => {
      contentRepo.seed([
        anArticle({ id: '1', slug: 'a' }),
        anArticle({ id: '2', slug: 'b' }),
      ]);

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
      contentRepo.seed([anArticle()]);
      await api('/api/v1/articles').expect(200);

      contentRepo.clear();
      const res = await api('/api/v1/articles').expect(200);
      const body = res.body as ListResponse<PublicArticleSummary>;

      expect(body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/articles/:slug', () => {
    it('returns 200 with article detail including seo fields', async () => {
      contentRepo.seedDetail(anArticleDetail());

      const res = await api('/api/v1/articles/test-article').expect(200);
      const body = res.body as PublicArticleDetail;

      expect(body.seo.seoTitle).toBe('SEO');
      expect(body.body).toBeDefined();
    });

    it('returns Cache-Control header', async () => {
      contentRepo.seedDetail(anArticleDetail());

      const res = await api('/api/v1/articles/test-article').expect(200);

      expect(res.headers['cache-control']).toBe(
        'public, max-age=600, stale-while-revalidate=60',
      );
    });

    it('returns ETag and Last-Modified headers', async () => {
      contentRepo.seedDetail(anArticleDetail());

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
      contentRepo.seedDetail(anArticleDetail());
      await api('/api/v1/articles/test-article').expect(200);

      contentRepo.clear();
      const res = await api('/api/v1/articles/test-article').expect(200);
      const body = res.body as PublicArticleDetail;

      expect(body.slug).toBe('test-article');
    });
  });

  describe('GET /api/v1/pages', () => {
    it('returns 200 with paginated page list', async () => {
      contentRepo.seedPages([aPage()]);

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
      contentRepo.seedPageDetail(aPageDetail());

      const res = await api('/api/v1/pages/test-page').expect(200);
      const body = res.body as PublicPageDetail;

      expect(body.seo.seoTitle).toBe('SEO Page');
      expect(body.body).toBeDefined();
    });

    it('returns Cache-Control header', async () => {
      contentRepo.seedPageDetail(aPageDetail());

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
      contentRepo.seedMedia(aMediaItem());

      const res = await api('/api/v1/media/media-1');
      const body = res.body as {
        id: string;
        filename: string;
        variants: Array<{ key: string }>;
      };

      expect(res.status).toBe(200);
      expect(body.id).toBe('media-1');
      expect(body.filename).toBe('photo.jpg');
      expect(body.variants).toHaveLength(1);
      expect(body.variants[0]?.key).toBe('original');
    });

    it('returns Cache-Control header', async () => {
      contentRepo.seedMedia(aMediaItem());

      const res = await api('/api/v1/media/media-1');

      expect(res.headers['cache-control']).toBe(
        'public, max-age=600, stale-while-revalidate=60',
      );
    });

    it('returns 404 with correct error envelope for unknown id', async () => {
      const res = await api('/api/v1/media/00000000-0000-0000-0000-000000000000');
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(404);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Media item not found');
    });

    it('returns 401 when X-API-Key header is missing', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/media/media-1');

      expect(res.status).toBe(401);
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 after exceeding the request limit', async () => {
      contentRepo.seed([anArticle()]);

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
      contentRepo.seed([anArticle()]);

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

function anArticle(overrides: Partial<PublicArticleSummary> = {}): PublicArticleSummary {
  return {
    id: 'article-1',
    title: 'Test Article',
    slug: 'test-article',
    excerpt: 'Some excerpt',
    publishedAt: new Date('2026-01-01'),
    author: { id: 'user-1', name: 'Author' },
    tags: [],
    category: null,
    featuredImageUrl: null,
    ...overrides,
  };
}

function anArticleDetail(
  overrides: Partial<PublicArticleDetail> = {},
): PublicArticleDetail {
  return {
    ...anArticle(),
    body: { type: 'doc', content: [] },
    seo: { seoTitle: 'SEO', seoDescription: 'Desc', socialImageUrl: null },
    ...overrides,
  };
}

function aPage(overrides: Partial<PublicPageSummary> = {}): PublicPageSummary {
  return {
    id: 'page-1',
    title: 'Test Page',
    slug: 'test-page',
    publishedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function aPageDetail(overrides: Partial<PublicPageDetail> = {}): PublicPageDetail {
  return {
    ...aPage(),
    body: { type: 'doc', content: [] },
    seo: { seoTitle: 'SEO Page', seoDescription: 'Page Desc', socialImageUrl: null },
    ...overrides,
  };
}

function aMediaItem(overrides: Partial<PublicMediaItem> = {}): PublicMediaItem {
  return {
    id: 'media-1',
    filename: 'photo.jpg',
    mimeType: 'image/jpeg',
    size: 102400,
    altText: 'A photo',
    caption: null,
    uploadedAt: new Date('2026-01-01'),
    variants: [
      {
        key: 'original',
        url: 'https://cdn.example.com/photo.jpg',
        width: 1920,
        height: 1080,
        size: 102400,
        mimeType: 'image/jpeg',
      },
    ],
    ...overrides,
  };
}
