import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { InMemoryCache } from '../../fakes/in-memory-cache';
import { InMemoryPublicContentRepository } from '../../fakes/in-memory-public-content.repository';
import { LOOKUP_API_KEY } from '../../../src/modules/api-keys/application/ports/tokens';
import { PublicApiModule } from '../../../src/modules/public-api/public-api.module';
import type {
  PublicArticleDetail,
  PublicArticleSummary,
  PublicPageDetail,
  PublicPageSummary,
} from '../../../src/modules/public-api/application/public-content.read-model';
import { PUBLIC_CONTENT_REPOSITORY } from '../../../src/modules/public-api/application/ports/out/public-content-repository.port';
import { CACHE } from '../../../src/shared/ports/cache.port';

@Catch(ZodError)
class ZodFilter implements ExceptionFilter {
  catch(err: ZodError, host: ArgumentsHost) {
    host.switchToHttp().getResponse().status(400).json({
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
      imports: [PublicApiModule],
    })
      .overrideProvider(PUBLIC_CONTENT_REPOSITORY)
      .useValue(contentRepo)
      .overrideProvider(CACHE)
      .useValue(cache)
      .overrideProvider(LOOKUP_API_KEY)
      .useValue({ execute: async () => ({ id: 'key-1', name: 'test' }) })
      .overrideProvider('REDIS_CLIENT')
      .useValue({})
      .compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new ZodFilter());
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

      expect(res.body.data).toHaveLength(1);
      expect(res.body.page).toBe(1);
      expect(res.body.page_size).toBe(25);
      expect(res.body.total).toBe(1);
      expect(res.body.total_pages).toBe(1);
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

      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(2);
      expect(res.body.total_pages).toBe(2);
    });

    it('returns 200 with empty data array when no articles exist', async () => {
      const res = await api('/api/v1/articles').expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('returns 401 when X-API-Key header is missing', async () => {
      await request(app.getHttpServer()).get('/api/v1/articles').expect(401);
    });

    it('serves from cache on second request', async () => {
      contentRepo.seed([anArticle()]);
      await api('/api/v1/articles').expect(200);

      contentRepo.clear();
      const res = await api('/api/v1/articles').expect(200);

      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/articles/:slug', () => {
    it('returns 200 with article detail including seo fields', async () => {
      contentRepo.seedDetail(anArticleDetail());

      const res = await api('/api/v1/articles/test-article').expect(200);

      expect(res.body.seo.seoTitle).toBe('SEO');
      expect(res.body.body).toBeDefined();
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

      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toBe('Article not found');
    });

    it('serves from cache on second request', async () => {
      contentRepo.seedDetail(anArticleDetail());
      await api('/api/v1/articles/test-article').expect(200);

      contentRepo.clear();
      const res = await api('/api/v1/articles/test-article').expect(200);

      expect(res.body.slug).toBe('test-article');
    });
  });

  describe('GET /api/v1/pages', () => {
    it('returns 200 with paginated page list', async () => {
      contentRepo.seedPages([aPage()]);

      const res = await api('/api/v1/pages').expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.page).toBe(1);
      expect(res.body.page_size).toBe(25);
      expect(res.body.total).toBe(1);
      expect(res.body.total_pages).toBe(1);
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

      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('returns 401 when X-API-Key header is missing', async () => {
      await request(app.getHttpServer()).get('/api/v1/pages').expect(401);
    });
  });

  describe('GET /api/v1/pages/:slug', () => {
    it('returns 200 with page detail and seo fields', async () => {
      contentRepo.seedPageDetail(aPageDetail());

      const res = await api('/api/v1/pages/test-page').expect(200);

      expect(res.body.seo.seoTitle).toBe('SEO Page');
      expect(res.body.body).toBeDefined();
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

      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toBe('Page not found');
    });
  });

  describe('pagination validation', () => {
    it('returns 400 when page_size exceeds 100', async () => {
      await api('/api/v1/articles?page_size=101').expect(400);
    });

    it('defaults page=1 page_size=25 when no params provided', async () => {
      const res = await api('/api/v1/articles').expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.page_size).toBe(25);
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
