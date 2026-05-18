import type {
  PublicMediaItem,
  PublicContentRepository,
  PublicListQuery,
} from '../../src/modules/public-api/application/ports/out/public-content-repository.port';
import type {
  PaginatedResult,
  PublicArticleDetail,
  PublicArticleSummary,
  PublicPageDetail,
  PublicPageSummary,
} from '../../src/modules/public-api/application/public-content.read-model';

export class InMemoryPublicContentRepository implements PublicContentRepository {
  readonly calls = {
    listPublishedArticles: 0,
    getPublishedArticleBySlug: 0,
    listPublishedPages: 0,
    getPublishedPageBySlug: 0,
  };

  private articles: PublicArticleDetail[] = [];
  private pages: PublicPageDetail[] = [];
  private mediaItems: Map<string, PublicMediaItem> = new Map();

  seed(articles: Array<PublicArticleSummary | PublicArticleDetail>): void {
    this.articles = articles.map(toArticleDetail);
  }

  seedDetail(article: PublicArticleDetail): void {
    this.articles = [
      ...this.articles.filter((existing) => existing.slug !== article.slug),
      article,
    ];
  }

  seedPages(pages: Array<PublicPageSummary | PublicPageDetail>): void {
    this.pages = pages.map(toPageDetail);
  }

  seedPageDetail(page: PublicPageDetail): void {
    this.pages = [
      ...this.pages.filter((existing) => existing.slug !== page.slug),
      page,
    ];
  }

  seedMedia(item: PublicMediaItem): void {
    this.mediaItems.set(item.id, item);
  }

  clear(): void {
    this.articles = [];
    this.pages = [];
    this.mediaItems.clear();
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

  getMediaById(id: string): Promise<PublicMediaItem | null> {
    return Promise.resolve(this.mediaItems.get(id) ?? null);
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

function toArticleDetail(article: PublicArticleSummary | PublicArticleDetail): PublicArticleDetail {
  if ('body' in article && 'seo' in article) {
    return article;
  }

  return {
    ...article,
    body: { type: 'doc', content: [] },
    seo: {
      seoTitle: null,
      seoDescription: null,
      socialImageUrl: null,
    },
  };
}

function toPageDetail(page: PublicPageSummary | PublicPageDetail): PublicPageDetail {
  if ('body' in page && 'seo' in page) {
    return page;
  }

  return {
    ...page,
    body: { type: 'doc', content: [] },
    seo: {
      seoTitle: null,
      seoDescription: null,
      socialImageUrl: null,
    },
  };
}
