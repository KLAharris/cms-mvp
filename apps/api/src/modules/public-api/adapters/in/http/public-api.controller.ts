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
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

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
import type { PublicMediaItem } from '../../../application/ports/out/public-content-repository.port';
import { GetPublicMediaItemUseCase } from '../../../application/use-cases/get-public-media-item.use-case';
import { ApiKeyThrottlerGuard } from './api-key-throttler.guard';
import { PaginationQuerySchema } from './dto/pagination-query.dto';
import { toETag, toLastModified, wrapList } from './dto/public-api.response';

type HeaderResponse = {
  setHeader(name: string, value: string): void;
};

@ApiTags('Public API')
@ApiSecurity('X-API-Key')
@Controller('api/v1')
@UseGuards(ApiKeyGuard, ApiKeyThrottlerGuard)
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
    @Inject(GetPublicMediaItemUseCase)
    private readonly getPublicMediaItemUseCase: GetPublicMediaItemUseCase,
  ) {}

  @Get('articles')
  @ApiOperation({ summary: 'List published articles' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'page_size', required: false, type: Number, example: 25 })
  @ApiResponse({ status: 200, description: 'Paginated list of published articles' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async listArticles(
    @Query() rawQuery: unknown,
    @Res({ passthrough: true }) res: HeaderResponse,
  ) {
    const { page, page_size: pageSize } = PaginationQuerySchema.parse(rawQuery);
    const result = await this.listArticlesUseCase.execute({ page, pageSize });
    const body = wrapList(result);

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.setHeader('ETag', toETag(body));
    const lastModifiedDate =
      result.data.length > 0
        ? result.data.reduce((a, b) => (a.publishedAt > b.publishedAt ? a : b))
            .publishedAt
        : new Date(0);
    res.setHeader('Last-Modified', toLastModified(lastModifiedDate));

    return body;
  }

  @Get('articles/:slug')
  @ApiOperation({ summary: 'Get a published article by slug' })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({ status: 200, description: 'Article detail' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
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
  @ApiOperation({ summary: 'List published pages' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'page_size', required: false, type: Number, example: 25 })
  @ApiResponse({ status: 200, description: 'Paginated list of published pages' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async listPages(
    @Query() rawQuery: unknown,
    @Res({ passthrough: true }) res: HeaderResponse,
  ) {
    const { page, page_size: pageSize } = PaginationQuerySchema.parse(rawQuery);
    const result = await this.listPagesUseCase.execute({ page, pageSize });
    const body = wrapList(result);

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.setHeader('ETag', toETag(body));
    const lastModifiedDate =
      result.data.length > 0
        ? result.data.reduce((a, b) => (a.publishedAt > b.publishedAt ? a : b))
            .publishedAt
        : new Date(0);
    res.setHeader('Last-Modified', toLastModified(lastModifiedDate));

    return body;
  }

  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get a published page by slug' })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({ status: 200, description: 'Page detail' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
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

  @Get('media/:id')
  @ApiOperation({ summary: 'Get a media item by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Media item metadata and variants' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  @ApiResponse({ status: 404, description: 'Media item not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getMediaById(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: HeaderResponse,
  ): Promise<PublicMediaItem> {
    const item = await this.getPublicMediaItemUseCase.execute(id);

    if (!item) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: 'Media item not found' },
      });
    }

    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');

    return item;
  }
}
