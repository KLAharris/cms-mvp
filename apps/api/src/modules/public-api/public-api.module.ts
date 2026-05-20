import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';

import { RedisCacheAdapter } from '../../shared/adapters/redis-cache.adapter';
import { CACHE } from '../../shared/ports/cache.port';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { ApiKeyGuard } from '../api-keys/adapters/in/http';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { CacheInvalidationHandler } from './adapters/in/events/cache-invalidation.handler';
import { ApiKeyThrottlerGuard } from './adapters/in/http/api-key-throttler.guard';
import { PublicApiController } from './adapters/in/http/public-api.controller';
import { ThrottlerExceptionFilter } from './adapters/in/http/throttler-exception.filter';
import { PrismaPublicContentRepository } from './adapters/out/persistence/prisma-public-content.repository';
import { GET_PUBLISHED_ARTICLE_BY_SLUG } from './application/ports/in/get-published-article-by-slug.port';
import { GET_PUBLISHED_PAGE_BY_SLUG } from './application/ports/in/get-published-page-by-slug.port';
import { LIST_PUBLISHED_ARTICLES } from './application/ports/in/list-published-articles.port';
import { LIST_PUBLISHED_PAGES } from './application/ports/in/list-published-pages.port';
import { PUBLIC_CONTENT_REPOSITORY } from './application/ports/out/public-content-repository.port';
import { GetPublishedArticleBySlug } from './application/use-cases/get-published-article-by-slug.use-case';
import { GetPublishedPageBySlug } from './application/use-cases/get-published-page-by-slug.use-case';
import { GetPublicMediaItemUseCase } from './application/use-cases/get-public-media-item.use-case';
import { ListPublishedArticles } from './application/use-cases/list-published-articles.use-case';
import { ListPublishedPages } from './application/use-cases/list-published-pages.use-case';

@Module({
  imports: [
    PrismaModule,
    ApiKeysModule,
    ConfigModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redis = redisUrl
          ? new Redis(redisUrl, {
              enableOfflineQueue: false,
              enableReadyCheck: false,
              maxRetriesPerRequest: 1,
              retryStrategy: () => null,
            })
          : new Redis({
              host: configService.get('REDIS_HOST', 'localhost'),
              port: configService.get<number>('REDIS_PORT', 6379),
              password: configService.get('REDIS_PASSWORD') || undefined,
              enableOfflineQueue: false,
              enableReadyCheck: false,
              maxRetriesPerRequest: 1,
              retryStrategy: () => null,
            });

        redis.on('error', () => undefined);

        return redis;
      },
      inject: [ConfigService],
    },
    {
      provide: PUBLIC_CONTENT_REPOSITORY,
      useClass: PrismaPublicContentRepository,
    },
    {
      provide: CACHE,
      useClass: RedisCacheAdapter,
    },
    { provide: LIST_PUBLISHED_ARTICLES, useClass: ListPublishedArticles },
    {
      provide: GET_PUBLISHED_ARTICLE_BY_SLUG,
      useClass: GetPublishedArticleBySlug,
    },
    { provide: LIST_PUBLISHED_PAGES, useClass: ListPublishedPages },
    { provide: GET_PUBLISHED_PAGE_BY_SLUG, useClass: GetPublishedPageBySlug },
    GetPublicMediaItemUseCase,
    ApiKeyGuard,
    ApiKeyThrottlerGuard,
    {
      provide: APP_FILTER,
      useClass: ThrottlerExceptionFilter,
    },
    CacheInvalidationHandler,
  ],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
