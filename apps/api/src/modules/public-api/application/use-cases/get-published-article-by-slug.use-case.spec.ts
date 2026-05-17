import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InMemoryCache } from '../../../../../test/fakes/in-memory-cache';
import { InMemoryPublicContentRepository } from '../../../../../test/fakes/in-memory-public-content.repository';
import { CacheKeys } from '../cache-keys';
import type { PublicArticleDetail } from '../public-content.read-model';
import { GetPublishedArticleBySlug } from './get-published-article-by-slug.use-case';

describe('GetPublishedArticleBySlug', () => {
  let repo: InMemoryPublicContentRepository;
  let cache: InMemoryCache;
  let useCase: GetPublishedArticleBySlug;

  beforeEach(() => {
    repo = new InMemoryPublicContentRepository();
    cache = new InMemoryCache();
    useCase = new GetPublishedArticleBySlug(repo, cache);
  });

  it('returns article from repository on cache miss and caches it', async () => {
    const article = makeArticle('1', 'one');
    repo.seed([article]);

    const result = await useCase.execute({ slug: 'one' });

    expect(result).toEqual(article);
    expect(repo.calls.getPublishedArticleBySlug).toBe(1);
    await expect(cache.get(CacheKeys.articleBySlug('one'))).resolves.toBe(
      JSON.stringify(article),
    );
  });

  it('returns cached article on hit without calling repository', async () => {
    const cached = makeArticle('1', 'one');
    await cache.set(CacheKeys.articleBySlug('one'), JSON.stringify(cached), 600);

    const result = await useCase.execute({ slug: 'one' });

    expect(result).toEqual(JSON.parse(JSON.stringify(cached)));
    expect(repo.calls.getPublishedArticleBySlug).toBe(0);
  });

  it('returns DB result when cache.get() throws', async () => {
    const article = makeArticle('1', 'one');
    repo.seed([article]);
    cache.setFailMode(true);

    const result = await useCase.execute({ slug: 'one' });

    expect(result).toEqual(article);
    expect(repo.calls.getPublishedArticleBySlug).toBe(1);
  });

  it('returns DB result when cache.set() throws', async () => {
    const article = makeArticle('1', 'one');
    repo.seed([article]);
    vi.spyOn(cache, 'set').mockRejectedValueOnce(new Error('Redis unavailable'));

    const result = await useCase.execute({ slug: 'one' });

    expect(result).toEqual(article);
    expect(repo.calls.getPublishedArticleBySlug).toBe(1);
  });

  it('returns null when article not found and does NOT cache the null', async () => {
    const result = await useCase.execute({ slug: 'missing' });

    expect(result).toBeNull();
    expect(repo.calls.getPublishedArticleBySlug).toBe(1);
    await expect(cache.get(CacheKeys.articleBySlug('missing'))).resolves.toBeNull();
  });
});

function makeArticle(id: string, slug: string): PublicArticleDetail {
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
    body: { type: 'doc', content: [{ type: 'paragraph' }] },
    seo: {
      seoTitle: `SEO ${id}`,
      seoDescription: `Description ${id}`,
      socialImageUrl: `https://cdn.example.com/social-${id}.jpg`,
    },
  };
}
