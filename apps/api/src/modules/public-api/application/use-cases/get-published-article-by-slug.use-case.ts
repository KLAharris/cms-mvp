import { Inject, Injectable } from '@nestjs/common';

import { CACHE, type Cache } from '../../../../shared/ports/cache.port';
import { CacheKeys, CacheTtl } from '../cache-keys';
import type { PublicArticleDetail } from '../public-content.read-model';
import type {
  GetPublishedArticleBySlugQuery,
  GetPublishedArticleBySlugUseCase,
} from '../ports/in/get-published-article-by-slug.port';
import {
  PUBLIC_CONTENT_REPOSITORY,
  type PublicContentRepository,
} from '../ports/out/public-content-repository.port';

@Injectable()
export class GetPublishedArticleBySlug implements GetPublishedArticleBySlugUseCase {
  constructor(
    @Inject(PUBLIC_CONTENT_REPOSITORY)
    private readonly repo: PublicContentRepository,
    @Inject(CACHE)
    private readonly cache: Cache,
  ) {}

  async execute(
    query: GetPublishedArticleBySlugQuery,
  ): Promise<PublicArticleDetail | null> {
    const key = CacheKeys.articleBySlug(query.slug);

    try {
      const cached = await this.cache.get(key);
      if (cached) {
        const parsed = JSON.parse(cached) as PublicArticleDetail;
        parsed.publishedAt = new Date(parsed.publishedAt);
        return parsed;
      }
    } catch {
      // Redis unavailable - degrade gracefully to DB.
    }

    const article = await this.repo.getPublishedArticleBySlug(query.slug);
    if (!article) {
      return null;
    }

    try {
      await this.cache.set(key, JSON.stringify(article), CacheTtl.DETAIL_SECONDS);
    } catch {
      // Redis unavailable - return DB result without caching.
    }

    return article;
  }
}
