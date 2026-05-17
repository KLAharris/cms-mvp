import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryCache } from '../../../../../../test/fakes/in-memory-cache';
import { ContentPublished } from '../../../../content/domain/events/content-published.event';
import { ContentUnpublished } from '../../../../content/domain/events/content-unpublished.event';
import { ContentId } from '../../../../content/domain/value-objects/content-id.vo';
import { CacheKeys } from '../../../application/cache-keys';
import { CacheInvalidationHandler } from './cache-invalidation.handler';

describe('CacheInvalidationHandler', () => {
  let handler: CacheInvalidationHandler;
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
    handler = new CacheInvalidationHandler(cache);
  });

  it('handleContentPublished evicts article list cache', async () => {
    await seedPublicCache(cache);

    await handler.handleContentPublished(makePublishedEvent('my-article'));

    await expect(cache.get(CacheKeys.articleList(1, 25))).resolves.toBeNull();
  });

  it('handleContentPublished evicts article slug cache', async () => {
    await seedPublicCache(cache);

    await handler.handleContentPublished(makePublishedEvent('my-article'));

    await expect(cache.get(CacheKeys.articleBySlug('my-article'))).resolves.toBeNull();
  });

  it('handleContentPublished evicts page list cache', async () => {
    await seedPublicCache(cache);

    await handler.handleContentPublished(makePublishedEvent('my-page'));

    await expect(cache.get(CacheKeys.pageList(1, 25))).resolves.toBeNull();
  });

  it('handleContentPublished evicts page slug cache', async () => {
    await seedPublicCache(cache);

    await handler.handleContentPublished(makePublishedEvent('my-page'));

    await expect(cache.get(CacheKeys.pageBySlug('my-page'))).resolves.toBeNull();
  });

  it('handleContentUnpublished evicts article list and slug cache', async () => {
    await seedPublicCache(cache);

    await handler.handleContentUnpublished(makeUnpublishedEvent('my-article'));

    await expect(cache.get(CacheKeys.articleList(1, 25))).resolves.toBeNull();
    await expect(cache.get(CacheKeys.articleBySlug('my-article'))).resolves.toBeNull();
  });

  it('handleContentUnpublished evicts page list and slug cache', async () => {
    await seedPublicCache(cache);

    await handler.handleContentUnpublished(makeUnpublishedEvent('my-page'));

    await expect(cache.get(CacheKeys.pageList(1, 25))).resolves.toBeNull();
    await expect(cache.get(CacheKeys.pageBySlug('my-page'))).resolves.toBeNull();
  });

  it('unrelated cache keys are not evicted', async () => {
    await seedPublicCache(cache);
    await cache.set('other:key', 'value', 300);

    await handler.handleContentPublished(makePublishedEvent('my-article'));

    await expect(cache.get('other:key')).resolves.toBe('value');
  });

  it('handler does not throw when cache keys do not exist', async () => {
    await expect(
      handler.handleContentUnpublished(makeUnpublishedEvent('missing-slug')),
    ).resolves.toBeUndefined();
  });
});

async function seedPublicCache(cache: InMemoryCache): Promise<void> {
  await cache.set(CacheKeys.articleList(1, 25), 'list-data', 300);
  await cache.set(CacheKeys.articleBySlug('my-article'), 'detail-data', 600);
  await cache.set(CacheKeys.pageList(1, 25), 'page-list-data', 300);
  await cache.set(CacheKeys.pageBySlug('my-page'), 'page-detail-data', 600);
}

function makePublishedEvent(slug: string): ContentPublished & { slug: string } {
  return Object.assign(
    new ContentPublished(
      ContentId.create('11111111-1111-4111-8111-111111111111'),
      new Date('2026-01-01T00:00:00.000Z'),
      'actor-1',
    ),
    { slug },
  );
}

function makeUnpublishedEvent(slug: string): ContentUnpublished & { slug: string } {
  return Object.assign(
    new ContentUnpublished(
      ContentId.create('11111111-1111-4111-8111-111111111111'),
      'actor-1',
      new Date('2026-01-01T00:00:00.000Z'),
    ),
    { slug },
  );
}
