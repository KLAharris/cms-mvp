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

export interface PublicMediaVariant {
  key: string;
  url: string;
  width: number | null;
  height: number | null;
  size: number;
  mimeType: string;
}

export interface PublicMediaItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  altText: string | null;
  caption: string | null;
  uploadedAt: Date;
  variants: PublicMediaVariant[];
}

export interface PublicContentRepository {
  listPublishedArticles(
    query: PublicListQuery,
  ): Promise<PaginatedResult<PublicArticleSummary>>;
  getPublishedArticleBySlug(slug: string): Promise<PublicArticleDetail | null>;
  listPublishedPages(query: PublicListQuery): Promise<PaginatedResult<PublicPageSummary>>;
  getPublishedPageBySlug(slug: string): Promise<PublicPageDetail | null>;
  getMediaById(id: string): Promise<PublicMediaItem | null>;
}

export type IPublicContentRepository = PublicContentRepository;

export const PUBLIC_CONTENT_REPOSITORY = Symbol('PUBLIC_CONTENT_REPOSITORY');
