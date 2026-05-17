import type {
  PaginatedResult,
  PublicPageSummary,
} from '../../public-content.read-model';

export type ListPublishedPagesQuery = {
  page: number;
  pageSize: number;
};

export interface ListPublishedPagesUseCase {
  execute(query: ListPublishedPagesQuery): Promise<PaginatedResult<PublicPageSummary>>;
}

export const LIST_PUBLISHED_PAGES = Symbol('LIST_PUBLISHED_PAGES');
