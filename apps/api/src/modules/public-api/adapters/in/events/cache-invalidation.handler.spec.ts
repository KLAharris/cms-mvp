import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InMemoryCache } from '../../../../../../test/fakes/in-memory-cache';
import type {
  ContentPublishedPayload,
  ContentUnpublishedPayload,
} from '../../../../../shared/events/content-event-payloads';
import { CacheKeys } from '../../../application/cache-keys';
import { CacheInvalidationHandler } from './cache-invalidation.handler';

describe('CacheInvalidationHandler', () => {
  let handler: CacheInvalidationHandler;
  let cache: InMemoryCache;
  let mockPrisma: { content: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    cache = new InMemoryCache();
    mockPrisma = {
      content: {
        findUnique: vi.fn().mockResolvedValue({ slug: 'my-article' }),
      },
    };
    handler = new CacheInvalidationHandler(cache, mockPrisma as never);
  });

  it('handleContentPublished evicts article list cache', async () => {
    await seedPublicCache(cache);

    await handler.handleContentPublished(makePublishedEvent());

    await expect(cache.get(CacheKeys.articleList(1, 25))).resolves.toBeNull();
  });

  it('handleContentPublished evicts article slug cache', async () => {
    await seedPublicCache(cache);

    await handler.handleContentPublished(makePublishedEvent());

    await expect(cache.get(CacheKeys.articleBySlug('my-article'))).resolves.toBeNull();
  });

  it('handleContentPublished evicts page list cache', async () => {
    await seedPublicCache(cache);

    await handler.handleContentPublished(makePublishedEvent());

    await expect(cache.get(CacheKeys.pageList(1, 25))).resolves.toBeNull();
  });

  it('handleContentPublished evicts page slug cache', async () => {
    await seedPublicCache(cache);
    mockPrisma.content.findUnique.mockResolvedValue({ slug: 'my-page' });

    await handler.handleContentPublished(makePublishedEvent());

    await expect(cache.get(CacheKeys.pageBySlug('my-page'))).resolves.toBeNull();
  });

  it('handleContentUnpublished evicts article list and slug cache', async () => {
    await seedPublicCache(cache);

    await handler.handleContentUnpublished(makeUnpublishedEvent());

    await expect(cache.get(CacheKeys.articleList(1, 25))).resolves.toBeNull();
    await expect(cache.get(CacheKeys.articleBySlug('my-article'))).resolves.toBeNull();
  });

  it('handleContentUnpublished evicts page list and slug cache', async () => {
    await seedPublicCache(cache);
    mockPrisma.content.findUnique.mockResolvedValue({ slug: 'my-page' });

    await handler.handleContentUnpublished(makeUnpublishedEvent());

    await expect(cache.get(CacheKeys.pageList(1, 25))).resolves.toBeNull();
    await expect(cache.get(CacheKeys.pageBySlug('my-page'))).resolves.toBeNull();
  });

  it('unrelated cache keys are not evicted', async () => {
    await seedPublicCache(cache);
    await cache.set('other:key', 'value', 300);

    await handler.handleContentPublished(makePublishedEvent());

    await expect(cache.get('other:key')).resolves.toBe('value');
  });

  it('handler does not throw when cache keys do not exist', async () => {
    await expect(
      handler.handleContentUnpublished(makeUnpublishedEvent()),
    ).resolves.toBeUndefined();
  });

  it('does not throw when content row is not found', async () => {
    mockPrisma.content.findUnique.mockResolvedValue(null);

    await expect(
      handler.handleContentPublished(makePublishedEvent()),
    ).resolves.toBeUndefined();
  });
});

async function seedPublicCache(cache: InMemoryCache): Promise<void> {
  await cache.set(CacheKeys.articleList(1, 25), 'list-data', 300);
  await cache.set(CacheKeys.articleBySlug('my-article'), 'detail-data', 600);
  await cache.set(CacheKeys.pageList(1, 25), 'page-list-data', 300);
  await cache.set(CacheKeys.pageBySlug('my-page'), 'page-detail-data', 600);
}

function makePublishedEvent(): ContentPublishedPayload {
  return {
    contentId: '11111111-1111-4111-8111-111111111111',
    actorId: 'actor-1',
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function makeUnpublishedEvent(): ContentUnpublishedPayload {
  return {
    contentId: '11111111-1111-4111-8111-111111111111',
    actorId: 'actor-1',
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}
