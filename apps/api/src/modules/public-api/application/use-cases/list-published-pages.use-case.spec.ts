import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InMemoryCache } from '../../../../../test/fakes/in-memory-cache';
import { InMemoryPublicContentRepository } from '../../../../../test/fakes/in-memory-public-content.repository';
import { CacheKeys } from '../cache-keys';
import type { PublicPageDetail } from '../public-content.read-model';
import { ListPublishedPages } from './list-published-pages.use-case';

describe('ListPublishedPages', () => {
  let repo: InMemoryPublicContentRepository;
  let cache: InMemoryCache;
  let useCase: ListPublishedPages;

  beforeEach(() => {
    repo = new InMemoryPublicContentRepository();
    cache = new InMemoryCache();
    useCase = new ListPublishedPages(repo, cache);
  });

  it('returns paginated pages on cache miss and caches result', async () => {
    repo.seedPages([makePage('1', 'one'), makePage('2', 'two')]);

    const result = await useCase.execute({ page: 1, pageSize: 1 });

    expect(result).toEqual({
      data: [makePageSummary('1', 'one')],
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(repo.calls.listPublishedPages).toBe(1);
    await expect(cache.get(CacheKeys.pageList(1, 1))).resolves.toBe(
      JSON.stringify(result),
    );
  });

  it('returns cached result on hit', async () => {
    const cached = {
      data: [makePageSummary('1', 'one')],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    };
    await cache.set(CacheKeys.pageList(1, 10), JSON.stringify(cached), 300);

    const result = await useCase.execute({ page: 1, pageSize: 10 });

    expect(result).toEqual(cached);
    expect(repo.calls.listPublishedPages).toBe(0);
  });

  it('returns DB result when cache.get() throws', async () => {
    repo.seedPages([makePage('1', 'one')]);
    cache.setFailMode(true);

    const result = await useCase.execute({ page: 1, pageSize: 10 });

    expect(result).toEqual({
      data: [makePageSummary('1', 'one')],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(repo.calls.listPublishedPages).toBe(1);
  });

  it('returns DB result when cache.set() throws', async () => {
    repo.seedPages([makePage('1', 'one')]);
    vi.spyOn(cache, 'set').mockRejectedValueOnce(new Error('Redis unavailable'));

    const result = await useCase.execute({ page: 1, pageSize: 10 });

    expect(result).toEqual({
      data: [makePageSummary('1', 'one')],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(repo.calls.listPublishedPages).toBe(1);
  });

  it('different page/size combos cached under separate keys', async () => {
    repo.seedPages([makePage('1', 'one'), makePage('2', 'two')]);

    const firstPage = await useCase.execute({ page: 1, pageSize: 1 });
    const secondPage = await useCase.execute({ page: 2, pageSize: 1 });

    expect(firstPage.data).toEqual([makePageSummary('1', 'one')]);
    expect(secondPage.data).toEqual([makePageSummary('2', 'two')]);
    expect(repo.calls.listPublishedPages).toBe(2);
    await expect(cache.get(CacheKeys.pageList(1, 1))).resolves.toBe(
      JSON.stringify(firstPage),
    );
    await expect(cache.get(CacheKeys.pageList(2, 1))).resolves.toBe(
      JSON.stringify(secondPage),
    );
  });
});

function makePage(id: string, slug: string): PublicPageDetail {
  return {
    ...makePageSummary(id, slug),
    body: { type: 'doc', content: [{ type: 'paragraph' }] },
    seo: {
      seoTitle: `SEO ${id}`,
      seoDescription: `Description ${id}`,
      socialImageUrl: `https://cdn.example.com/social-${id}.jpg`,
    },
  };
}

function makePageSummary(id: string, slug: string) {
  return {
    id,
    title: `Page ${id}`,
    slug,
    publishedAt: new Date(`2026-02-0${id}T00:00:00.000Z`),
  };
}
