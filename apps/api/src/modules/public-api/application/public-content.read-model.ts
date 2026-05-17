export type PublicAuthor = {
  id: string;
  name: string;
};

export type PublicSeoMetadata = {
  seoTitle: string | null;
  seoDescription: string | null;
  socialImageUrl: string | null;
};

export type PublicArticleSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date;
  author: PublicAuthor;
  tags: string[];
  category: string | null;
  featuredImageUrl: string | null;
};

export type PublicArticleDetail = PublicArticleSummary & {
  body: unknown;
  seo: PublicSeoMetadata;
};

export type PublicPageSummary = {
  id: string;
  title: string;
  slug: string;
  publishedAt: Date;
};

export type PublicPageDetail = PublicPageSummary & {
  body: unknown;
  seo: PublicSeoMetadata;
};

export type PaginatedResult<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
