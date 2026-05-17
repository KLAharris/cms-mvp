import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InMemoryCache } from '../../../../../test/fakes/in-memory-cache';
import { InMemoryPublicContentRepository } from '../../../../../test/fakes/in-memory-public-content.repository';
import { CacheKeys } from '../cache-keys';
import type { PublicPageDetail } from '../public-content.read-model';
import { GetPublishedPageBySlug } from './get-published-page-by-slug.use-case';

describe('GetPublishedPageBySlug', () => {
  let repo: InMemoryPublicContentRepository;
  let cache: InMemoryCache;
  let useCase: GetPublishedPageBySlug;

  beforeEach(() => {
    repo = new InMemoryPublicContentRepository();
    cache = new InMemoryCache();
    useCase = new GetPublishedPageBySlug(repo, cache);
  });

  it('returns page from repository on cache miss and caches it', async () => {
    const page = makePage('1', 'one');
    repo.seedPages([page]);

    const result = await useCase.execute({ slug: 'one' });

    expect(result).toEqual(page);
    expect(repo.calls.getPublishedPageBySlug).toBe(1);
    await expect(cache.get(CacheKeys.pageBySlug('one'))).resolves.toBe(
      JSON.stringify(page),
    );
  });

  it('returns cached page on hit', async () => {
    const cached = makePage('1', 'one');
    await cache.set(CacheKeys.pageBySlug('one'), JSON.stringify(cached), 600);

    const result = await useCase.execute({ slug: 'one' });

    expect(result).toEqual(cached);
    expect(repo.calls.getPublishedPageBySlug).toBe(0);
  });

  it('returns DB result when cache.get() throws', async () => {
    const page = makePage('1', 'one');
    repo.seedPages([page]);
    cache.setFailMode(true);

    const result = await useCase.execute({ slug: 'one' });

    expect(result).toEqual(page);
    expect(repo.calls.getPublishedPageBySlug).toBe(1);
  });

  it('returns DB result when cache.set() throws', async () => {
    const page = makePage('1', 'one');
    repo.seedPages([page]);
    vi.spyOn(cache, 'set').mockRejectedValueOnce(new Error('Redis unavailable'));

    const result = await useCase.execute({ slug: 'one' });

    expect(result).toEqual(page);
    expect(repo.calls.getPublishedPageBySlug).toBe(1);
  });

  it('returns null when page not found and does NOT cache null', async () => {
    const result = await useCase.execute({ slug: 'missing' });

    expect(result).toBeNull();
    expect(repo.calls.getPublishedPageBySlug).toBe(1);
    await expect(cache.get(CacheKeys.pageBySlug('missing'))).resolves.toBeNull();
  });
});

function makePage(id: string, slug: string): PublicPageDetail {
  return {
    id,
    title: `Page ${id}`,
    slug,
    publishedAt: new Date(`2026-02-0${id}T00:00:00.000Z`),
    body: { type: 'doc', content: [{ type: 'paragraph' }] },
    seo: {
      seoTitle: `SEO ${id}`,
      seoDescription: `Description ${id}`,
      socialImageUrl: `https://cdn.example.com/social-${id}.jpg`,
    },
  };
}
