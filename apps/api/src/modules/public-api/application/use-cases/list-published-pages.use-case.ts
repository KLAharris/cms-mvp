import { Inject, Injectable } from '@nestjs/common';

import { CACHE, type Cache } from '../../../../shared/ports/cache.port';
import { CacheKeys, CacheTtl } from '../cache-keys';
import type { PaginatedResult, PublicPageSummary } from '../public-content.read-model';
import type {
  ListPublishedPagesQuery,
  ListPublishedPagesUseCase,
} from '../ports/in/list-published-pages.port';
import {
  PUBLIC_CONTENT_REPOSITORY,
  type PublicContentRepository,
} from '../ports/out/public-content-repository.port';

@Injectable()
export class ListPublishedPages implements ListPublishedPagesUseCase {
  constructor(
    @Inject(PUBLIC_CONTENT_REPOSITORY)
    private readonly repo: PublicContentRepository,
    @Inject(CACHE)
    private readonly cache: Cache,
  ) {}

  async execute(
    query: ListPublishedPagesQuery,
  ): Promise<PaginatedResult<PublicPageSummary>> {
    const { page, pageSize } = query;
    const key = CacheKeys.pageList(page, pageSize);

    try {
      const cached = await this.cache.get(key);
      if (cached) {
        return JSON.parse(cached) as PaginatedResult<PublicPageSummary>;
      }
    } catch {
      // Redis unavailable - degrade gracefully to DB.
    }

    const result = await this.repo.listPublishedPages({ page, pageSize });

    try {
      await this.cache.set(key, JSON.stringify(result), CacheTtl.LIST_SECONDS);
    } catch {
      // Redis unavailable - return DB result without caching.
    }

    return result;
  }
}
