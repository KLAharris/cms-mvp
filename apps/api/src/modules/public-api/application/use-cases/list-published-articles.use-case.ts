import { Inject, Injectable } from '@nestjs/common';

import { CACHE, type Cache } from '../../../../shared/ports/cache.port';
import { CacheKeys, CacheTtl } from '../cache-keys';
import type {
  PaginatedResult,
  PublicArticleSummary,
} from '../public-content.read-model';
import type {
  ListPublishedArticlesQuery,
  ListPublishedArticlesUseCase,
} from '../ports/in/list-published-articles.port';
import {
  PUBLIC_CONTENT_REPOSITORY,
  type PublicContentRepository,
} from '../ports/out/public-content-repository.port';

@Injectable()
export class ListPublishedArticles implements ListPublishedArticlesUseCase {
  constructor(
    @Inject(PUBLIC_CONTENT_REPOSITORY)
    private readonly repo: PublicContentRepository,
    @Inject(CACHE)
    private readonly cache: Cache,
  ) {}

  async execute(
    query: ListPublishedArticlesQuery,
  ): Promise<PaginatedResult<PublicArticleSummary>> {
    const { page, pageSize } = query;
    const key = CacheKeys.articleList(page, pageSize);

    const cached = await this.cache.get(key);
    if (cached) {
      return JSON.parse(cached) as PaginatedResult<PublicArticleSummary>;
    }

    const result = await this.repo.listPublishedArticles({ page, pageSize });
    await this.cache.set(key, JSON.stringify(result), CacheTtl.LIST_SECONDS);

    return result;
  }
}
