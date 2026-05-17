import type {
  PaginatedResult,
  PublicArticleDetail,
  PublicArticleSummary,
  PublicPageDetail,
  PublicPageSummary,
} from '../../public-content.read-model';

export type PublicListQuery = {
  page: number;
  pageSize: number;
};

export interface PublicContentRepository {
  listPublishedArticles(
    query: PublicListQuery,
  ): Promise<PaginatedResult<PublicArticleSummary>>;
  getPublishedArticleBySlug(slug: string): Promise<PublicArticleDetail | null>;
  listPublishedPages(query: PublicListQuery): Promise<PaginatedResult<PublicPageSummary>>;
  getPublishedPageBySlug(slug: string): Promise<PublicPageDetail | null>;
}

export const PUBLIC_CONTENT_REPOSITORY = Symbol('PUBLIC_CONTENT_REPOSITORY');
