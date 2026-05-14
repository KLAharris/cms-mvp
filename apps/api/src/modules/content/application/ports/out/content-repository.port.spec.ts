import { describe, expect, it } from 'vitest';

import { Content } from '../../../domain/entities/content.entity';
import { ContentId } from '../../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';
import { SeoMetadata } from '../../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../../domain/value-objects/slug.vo';
import {
  ContentRepository,
  ContentSearchCriteria,
  PagedResult,
} from './content-repository.port';

describe('ContentRepository port', () => {
  it('defines repository and paging contracts', async () => {
    const content = Content.create({
      id: ContentId.create('123e4567-e89b-42d3-a456-426614174000'),
      type: ContentType.Article,
      title: 'Title',
      slug: Slug.create('title'),
      authorId: 'author-1',
      seoMetadata: SeoMetadata.create('', ''),
      createdAt: new Date('2026-05-14T00:00:00.000Z'),
    });
    const page: PagedResult<Content> = {
      items: [content],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    };
    const repository: ContentRepository = {
      save: async (_content) => undefined,
      findById: async (_id) => content,
      findBySlug: async (_type, _slug) => content,
      findMany: async (_criteria: ContentSearchCriteria) => page,
      delete: async (_id) => undefined,
    };

    await expect(repository.findById(content.id)).resolves.toBe(content);
    await expect(
      repository.findBySlug(ContentType.Article, Slug.create('title')),
    ).resolves.toBe(content);
    await expect(
      repository.findMany({
        status: ContentStatus.Draft,
        type: ContentType.Article,
        authorId: 'author-1',
        tag: 'tech',
        titleSearch: 'tit',
        dateFrom: new Date('2026-05-01T00:00:00.000Z'),
        dateTo: new Date('2026-05-31T00:00:00.000Z'),
        page: 1,
        pageSize: 25,
      }),
    ).resolves.toBe(page);
    await expect(repository.save(content)).resolves.toBeUndefined();
    await expect(repository.delete(content.id)).resolves.toBeUndefined();
  });
});
