import type {
  PaginatedResult,
  PublicArticleDetail,
  PublicArticleSummary,
  PublicPageDetail,
  PublicPageSummary,
} from '../../src/modules/public-api/application/public-content.read-model';
import type {
  PublicContentRepository,
  PublicListQuery,
} from '../../src/modules/public-api/application/ports/out/public-content-repository.port';

export class InMemoryPublicContentRepository implements PublicContentRepository {
  readonly calls = {
    listPublishedArticles: 0,
    getPublishedArticleBySlug: 0,
    listPublishedPages: 0,
    getPublishedPageBySlug: 0,
  };

  private articles: PublicArticleDetail[] = [];
  private pages: PublicPageDetail[] = [];

  seed(articles: PublicArticleDetail[]): void {
    this.articles = articles;
  }

  seedPages(pages: PublicPageDetail[]): void {
    this.pages = pages;
  }

  listPublishedArticles(
    query: PublicListQuery,
  ): Promise<PaginatedResult<PublicArticleSummary>> {
    this.calls.listPublishedArticles += 1;

    return Promise.resolve(paginate(this.articles.map(toArticleSummary), query));
  }

  getPublishedArticleBySlug(slug: string): Promise<PublicArticleDetail | null> {
    this.calls.getPublishedArticleBySlug += 1;

    return Promise.resolve(this.articles.find((article) => article.slug === slug) ?? null);
  }

  listPublishedPages(query: PublicListQuery): Promise<PaginatedResult<PublicPageSummary>> {
    this.calls.listPublishedPages += 1;

    return Promise.resolve(paginate(this.pages.map(toPageSummary), query));
  }

  getPublishedPageBySlug(slug: string): Promise<PublicPageDetail | null> {
    this.calls.getPublishedPageBySlug += 1;

    return Promise.resolve(this.pages.find((page) => page.slug === slug) ?? null);
  }
}

function paginate<T>(items: T[], query: PublicListQuery): PaginatedResult<T> {
  const start = (query.page - 1) * query.pageSize;
  const data = items.slice(start, start + query.pageSize);

  return {
    data,
    page: query.page,
    pageSize: query.pageSize,
    total: items.length,
    totalPages: Math.ceil(items.length / query.pageSize),
  };
}

function toArticleSummary(article: PublicArticleDetail): PublicArticleSummary {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    publishedAt: article.publishedAt,
    author: article.author,
    tags: article.tags,
    category: article.category,
    featuredImageUrl: article.featuredImageUrl,
  };
}

function toPageSummary(page: PublicPageDetail): PublicPageSummary {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    publishedAt: page.publishedAt,
  };
}
