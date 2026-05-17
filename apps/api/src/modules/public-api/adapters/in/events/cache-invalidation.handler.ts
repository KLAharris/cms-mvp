import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { ContentPublished } from '../../../../content/domain/events/content-published.event';
import { ContentUnpublished } from '../../../../content/domain/events/content-unpublished.event';
import { CACHE, Cache } from '../../../../../shared/ports/cache.port';
import { PrismaService } from '../../../../../shared/prisma/prisma.service';
import { CacheKeys } from '../../../application/cache-keys';

@Injectable()
export class CacheInvalidationHandler {
  constructor(
    @Inject(CACHE)
    private readonly cache: Cache,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('content.published')
  async handleContentPublished(event: ContentPublished): Promise<void> {
    const slug = await this.getSlug(event.contentId);
    await this.invalidatePublicContentCache(slug);
  }

  @OnEvent('content.unpublished')
  async handleContentUnpublished(event: ContentUnpublished): Promise<void> {
    const slug = await this.getSlug(event.contentId);
    await this.invalidatePublicContentCache(slug);
  }

  private async getSlug(contentId: string | { value: string }): Promise<string | null> {
    const id = typeof contentId === 'string' ? contentId : contentId.value;
    const row = await this.prisma.content.findUnique({
      where: { id },
      select: { slug: true },
    });

    return row?.slug ?? null;
  }

  private async invalidatePublicContentCache(slug: string | null): Promise<void> {
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
