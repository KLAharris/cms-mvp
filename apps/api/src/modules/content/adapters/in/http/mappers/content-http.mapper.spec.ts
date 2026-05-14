import { describe, expect, it } from 'vitest';

import { ContentStatus } from '../../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../../domain/value-objects/content-type.vo';
import { ContentHttpMapper } from './content-http.mapper';

const NOW = new Date('2026-06-01T00:00:00.000Z');

describe('ContentHttpMapper', () => {
  it('maps summary and detail responses', () => {
    expect(
      ContentHttpMapper.toSummary({
        id: 'content-1',
        type: ContentType.Article,
        title: 'Title',
        slug: 'title',
        status: ContentStatus.Draft,
        authorId: 'author-1',
        publishedAt: null,
        updatedAt: NOW,
      }),
    ).toEqual({
      id: 'content-1',
      type: 'article',
      title: 'Title',
      slug: 'title',
      status: 'draft',
      authorId: 'author-1',
      publishedAt: null,
      updatedAt: NOW.toISOString(),
    });

    expect(
      ContentHttpMapper.toDetail({
        contentId: 'content-1',
        type: ContentType.Article,
        title: 'Title',
        slug: 'title',
        status: ContentStatus.Published,
        authorId: 'author-1',
        body: { type: 'doc' },
        featuredImageId: 'feature-1',
        socialImageId: 'social-1',
        seoMetadata: { title: 'SEO', description: 'Description' },
        tags: ['tech'],
        category: 'News',
        parentId: null,
        scheduledAt: NOW,
        publishedAt: NOW,
        deletedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ).toMatchObject({
      id: 'content-1',
      publishedAt: NOW.toISOString(),
      scheduledAt: NOW.toISOString(),
      seoTitle: 'SEO',
    });
  });
});
