import { Inject, Injectable } from '@nestjs/common';

import { CACHE, type Cache } from '../../../../shared/ports/cache.port';
import { CacheKeys, CacheTtl } from '../cache-keys';
import type { PublicPageDetail } from '../public-content.read-model';
import type {
  GetPublishedPageBySlugQuery,
  GetPublishedPageBySlugUseCase,
} from '../ports/in/get-published-page-by-slug.port';
import {
  PUBLIC_CONTENT_REPOSITORY,
  type PublicContentRepository,
} from '../ports/out/public-content-repository.port';

@Injectable()
export class GetPublishedPageBySlug implements GetPublishedPageBySlugUseCase {
  constructor(
    @Inject(PUBLIC_CONTENT_REPOSITORY)
    private readonly repo: PublicContentRepository,
    @Inject(CACHE)
    private readonly cache: Cache,
  ) {}

  async execute(query: GetPublishedPageBySlugQuery): Promise<PublicPageDetail | null> {
    const key = CacheKeys.pageBySlug(query.slug);

    try {
      const cached = await this.cache.get(key);
      if (cached) {
        return JSON.parse(cached) as PublicPageDetail;
      }
    } catch {
      // Redis unavailable - degrade gracefully to DB.
    }

    const page = await this.repo.getPublishedPageBySlug(query.slug);
    if (!page) {
      return null;
    }

    try {
      await this.cache.set(key, JSON.stringify(page), CacheTtl.DETAIL_SECONDS);
    } catch {
      // Redis unavailable - return DB result without caching.
    }

    return page;
  }
}
