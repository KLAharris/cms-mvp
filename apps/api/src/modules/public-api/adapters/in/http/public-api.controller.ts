import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../../../../api-keys/adapters/in/http';
import {
  GET_PUBLISHED_ARTICLE_BY_SLUG,
  type GetPublishedArticleBySlugUseCase,
} from '../../../application/ports/in/get-published-article-by-slug.port';
import {
  GET_PUBLISHED_PAGE_BY_SLUG,
  type GetPublishedPageBySlugUseCase,
} from '../../../application/ports/in/get-published-page-by-slug.port';
import {
  LIST_PUBLISHED_ARTICLES,
  type ListPublishedArticlesUseCase,
} from '../../../application/ports/in/list-published-articles.port';
import {
  LIST_PUBLISHED_PAGES,
  type ListPublishedPagesUseCase,
} from '../../../application/ports/in/list-published-pages.port';
import { PaginationQuerySchema } from './dto/pagination-query.dto';
import { toETag, toLastModified, wrapList } from './dto/public-api.response';

type HeaderResponse = {
  setHeader(name: string, value: string): void;
};

@Controller('api/v1')
@UseGuards(ApiKeyGuard)
export class PublicApiController {
  constructor(
    @Inject(LIST_PUBLISHED_ARTICLES)
    private readonly listArticlesUseCase: ListPublishedArticlesUseCase,
    @Inject(GET_PUBLISHED_ARTICLE_BY_SLUG)
    private readonly getArticleUseCase: GetPublishedArticleBySlugUseCase,
    @Inject(LIST_PUBLISHED_PAGES)
    private readonly listPagesUseCase: ListPublishedPagesUseCase,
    @Inject(GET_PUBLISHED_PAGE_BY_SLUG)
    private readonly getPageUseCase: GetPublishedPageBySlugUseCase,
  ) {}

  @Get('articles')
  async listArticles(
    @Query() rawQuery: unknown,
    @Res({ passthrough: true }) res: HeaderResponse,
  ) {
    const { page, page_size: pageSize } = PaginationQuerySchema.parse(rawQuery);
    const result = await this.listArticlesUseCase.execute({ page, pageSize });
    const body = wrapList(result);

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.setHeader('ETag', toETag(body));
    if (result.data.length > 0) {
      const latest = result.data.reduce((a, b) => (a.publishedAt > b.publishedAt ? a : b));
      res.setHeader('Last-Modified', toLastModified(latest.publishedAt));
    }

    return body;
  }

  @Get('articles/:slug')
  async getArticleBySlug(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: HeaderResponse,
  ) {
    const article = await this.getArticleUseCase.execute({ slug });

    if (!article) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: 'Article not found' },
      });
    }

    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
    res.setHeader('ETag', toETag(article));
    res.setHeader('Last-Modified', toLastModified(article.publishedAt));

    return article;
  }

  @Get('pages')
  async listPages(
    @Query() rawQuery: unknown,
    @Res({ passthrough: true }) res: HeaderResponse,
  ) {
    const { page, page_size: pageSize } = PaginationQuerySchema.parse(rawQuery);
    const result = await this.listPagesUseCase.execute({ page, pageSize });
    const body = wrapList(result);

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.setHeader('ETag', toETag(body));
    if (result.data.length > 0) {
      const latest = result.data.reduce((a, b) => (a.publishedAt > b.publishedAt ? a : b));
      res.setHeader('Last-Modified', toLastModified(latest.publishedAt));
    }

    return body;
  }

  @Get('pages/:slug')
  async getPageBySlug(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: HeaderResponse,
  ) {
    const page = await this.getPageUseCase.execute({ slug });

    if (!page) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: 'Page not found' },
      });
    }

    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
    res.setHeader('ETag', toETag(page));
    res.setHeader('Last-Modified', toLastModified(page.publishedAt));

    return page;
  }
}
