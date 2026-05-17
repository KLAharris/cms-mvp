import type {
  PaginatedResult,
  PublicArticleSummary,
} from '../../public-content.read-model';

export type ListPublishedArticlesQuery = {
  page: number;
  pageSize: number;
};

export interface ListPublishedArticlesUseCase {
  execute(
    query: ListPublishedArticlesQuery,
  ): Promise<PaginatedResult<PublicArticleSummary>>;
}

export const LIST_PUBLISHED_ARTICLES = Symbol('LIST_PUBLISHED_ARTICLES');
