import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InMemoryCache } from '../../../../../test/fakes/in-memory-cache';
import { InMemoryPublicContentRepository } from '../../../../../test/fakes/in-memory-public-content.repository';
import { CacheKeys } from '../cache-keys';
import type { PublicArticleDetail } from '../public-content.read-model';
import { ListPublishedArticles } from './list-published-articles.use-case';

describe('ListPublishedArticles', () => {
  let repo: InMemoryPublicContentRepository;
  let cache: InMemoryCache;
  let useCase: ListPublishedArticles;

  beforeEach(() => {
    repo = new InMemoryPublicContentRepository();
    cache = new InMemoryCache();
    useCase = new ListPublishedArticles(repo, cache);
  });

  it('returns paginated articles from repository on cache miss and caches the result', async () => {
    repo.seed([makeArticle('1', 'one'), makeArticle('2', 'two')]);

    const result = await useCase.execute({ page: 1, pageSize: 1 });

    expect(result).toEqual({
      data: [makeArticleSummary('1', 'one')],
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(repo.calls.listPublishedArticles).toBe(1);
    await expect(cache.get(CacheKeys.articleList(1, 1))).resolves.toBe(
      JSON.stringify(result),
    );
  });

  it('returns cached result on cache hit without calling repository', async () => {
    const cached = {
      data: [makeArticleSummary('1', 'one')],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    };
    await cache.set(CacheKeys.articleList(1, 10), JSON.stringify(cached), 300);

    const result = await useCase.execute({ page: 1, pageSize: 10 });

    expect(result).toEqual(cached);
    expect(repo.calls.listPublishedArticles).toBe(0);
  });

  it('returns DB result when cache.get() throws', async () => {
    repo.seed([makeArticle('1', 'one')]);
    cache.setFailMode(true);

    const result = await useCase.execute({ page: 1, pageSize: 10 });

    expect(result).toEqual({
      data: [makeArticleSummary('1', 'one')],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(repo.calls.listPublishedArticles).toBe(1);
  });

  it('returns DB result when cache.set() throws', async () => {
    repo.seed([makeArticle('1', 'one')]);
    vi.spyOn(cache, 'set').mockRejectedValueOnce(new Error('Redis unavailable'));

    const result = await useCase.execute({ page: 1, pageSize: 10 });

    expect(result).toEqual({
      data: [makeArticleSummary('1', 'one')],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(repo.calls.listPublishedArticles).toBe(1);
  });

  it('cache key includes page and pageSize so different pages are cached separately', async () => {
    repo.seed([makeArticle('1', 'one'), makeArticle('2', 'two')]);

    const firstPage = await useCase.execute({ page: 1, pageSize: 1 });
    const secondPage = await useCase.execute({ page: 2, pageSize: 1 });

    expect(firstPage.data).toEqual([makeArticleSummary('1', 'one')]);
    expect(secondPage.data).toEqual([makeArticleSummary('2', 'two')]);
    expect(repo.calls.listPublishedArticles).toBe(2);
    await expect(cache.get(CacheKeys.articleList(1, 1))).resolves.toBe(
      JSON.stringify(firstPage),
    );
    await expect(cache.get(CacheKeys.articleList(2, 1))).resolves.toBe(
      JSON.stringify(secondPage),
    );
  });
});

function makeArticle(id: string, slug: string): PublicArticleDetail {
  return {
    ...makeArticleSummary(id, slug),
    body: { type: 'doc', content: [{ type: 'paragraph' }] },
    seo: {
      seoTitle: `SEO ${id}`,
      seoDescription: `Description ${id}`,
      socialImageUrl: `https://cdn.example.com/social-${id}.jpg`,
    },
  };
}

function makeArticleSummary(id: string, slug: string) {
  return {
    id,
    title: `Article ${id}`,
    slug,
    excerpt: `Excerpt ${id}`,
    publishedAt: new Date(`2026-01-0${id}T00:00:00.000Z`),
    author: {
      id: `author-${id}`,
      name: `Author ${id}`,
    },
    tags: ['news'],
    category: 'Updates',
    featuredImageUrl: `https://cdn.example.com/featured-${id}.jpg`,
  };
}
