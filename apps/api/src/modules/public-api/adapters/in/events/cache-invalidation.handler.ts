import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { ContentPublished } from '../../../../content/domain/events/content-published.event';
import { ContentUnpublished } from '../../../../content/domain/events/content-unpublished.event';
import { CACHE, Cache } from '../../../../../shared/ports/cache.port';
import { CacheKeys } from '../../../application/cache-keys';

type ContentPublishedEvent = ContentPublished & { slug?: string };
type ContentUnpublishedEvent = ContentUnpublished & { slug?: string };

@Injectable()
export class CacheInvalidationHandler {
  constructor(
    @Inject(CACHE)
    private readonly cache: Cache,
  ) {}

  @OnEvent('content.published')
  async handleContentPublished(event: ContentPublishedEvent): Promise<void> {
    await this.invalidatePublicContentCache(event.slug);
  }

  @OnEvent('content.unpublished')
  async handleContentUnpublished(event: ContentUnpublishedEvent): Promise<void> {
    await this.invalidatePublicContentCache(event.slug);
  }

  private async invalidatePublicContentCache(slug?: string): Promise<void> {
    const invalidations = [
      this.cache.delByPattern(CacheKeys.articleListPattern()),
      this.cache.delByPattern(CacheKeys.pageListPattern()),
    ];

    if (slug) {
      invalidations.push(
        this.cache.del(CacheKeys.articleBySlug(slug)),
        this.cache.del(CacheKeys.pageBySlug(slug)),
      );
    }

    await Promise.all(invalidations);
  }
}
