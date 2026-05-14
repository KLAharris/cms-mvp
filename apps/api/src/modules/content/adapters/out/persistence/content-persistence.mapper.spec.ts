import { describe, expect, it } from 'vitest';

import { Content, ContentSnapshot } from '../../../domain/entities/content.entity';
import { ContentVersion } from '../../../domain/entities/content-version.entity';
import { ContentId } from '../../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';
import { RichTextBody } from '../../../domain/value-objects/rich-text-body.vo';
import { SeoMetadata } from '../../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../../domain/value-objects/slug.vo';
import { Tag } from '../../../domain/value-objects/tag.vo';
import {
  ContentPersistenceMapper,
  ContentVersionPersistenceMapper,
} from './content-persistence.mapper';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const ID = '123e4567-e89b-42d3-a456-426614174000';

function content(): Content {
  return Content.reconstitute({
    id: ContentId.create(ID),
    type: ContentType.Article,
    title: 'Title',
    slug: Slug.create('title'),
    body: RichTextBody.create({ type: 'doc' }),
    status: ContentStatus.Draft,
    authorId: 'author-1',
    featuredImageId: 'feature-1',
    socialImageId: 'social-1',
    seoMetadata: SeoMetadata.create('SEO', 'Description'),
    tags: [Tag.create('tech')],
    category: 'News',
    parentId: null,
    scheduledAt: null,
    publishedAt: null,
    deletedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

describe('ContentPersistenceMapper', () => {
  it('round-trips content persistence data', () => {
    const data = ContentPersistenceMapper.toPersistence(content());
    const domain = ContentPersistenceMapper.toDomain({
      id: ID,
      type: ContentType.Article,
      title: data.title,
      slug: data.slug,
      body: { type: 'doc' },
      status: ContentStatus.Draft,
      authorId: data.authorId,
      featuredImageId: 'feature-1',
      socialImageId: 'social-1',
      seoTitle: 'SEO',
      seoDescription: 'Description',
      tags: ['tech'],
      category: 'News',
      parentId: null,
      scheduledAt: null,
      publishedAt: null,
      deletedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(domain.id.value).toBe(ID);
    expect(domain.body?.nodes).toEqual({ type: 'doc' });
    expect(domain.tags[0]?.value).toBe('tech');
  });

  it('maps nullable content body fields', () => {
    const draft = content();
    draft.body = null;

    const data = ContentPersistenceMapper.toPersistence(draft);
    const domain = ContentPersistenceMapper.toDomain({
      id: ID,
      type: ContentType.Article,
      title: data.title,
      slug: data.slug,
      body: null,
      status: ContentStatus.Draft,
      authorId: data.authorId,
      featuredImageId: null,
      socialImageId: null,
      seoTitle: '',
      seoDescription: '',
      tags: [],
      category: null,
      parentId: null,
      scheduledAt: null,
      publishedAt: null,
      deletedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(data.body).toMatchObject({});
    expect(domain.body).toBeNull();
  });

  it('round-trips content version snapshots', () => {
    const version = ContentVersion.create({
      id: 'version-1',
      contentId: ContentId.create(ID),
      versionNo: 1,
      snapshot: {
        title: 'Title',
        slug: Slug.create('title'),
        body: RichTextBody.create({ type: 'doc' }),
        featuredImageId: null,
        socialImageId: null,
        seoMetadata: SeoMetadata.create('SEO', 'Description'),
        tags: [Tag.create('tech')],
        category: null,
        parentId: null,
        scheduledAt: NOW,
      },
      editorId: 'editor-1',
      createdAt: NOW,
    });

    const data = ContentVersionPersistenceMapper.toPersistence(version);
    const domain = ContentVersionPersistenceMapper.toDomain({
      id: 'version-1',
      contentId: data.contentId,
      versionNo: data.versionNo,
      snapshot: {
        title: 'Title',
        slug: 'title',
        body: { type: 'doc' },
        featuredImageId: null,
        socialImageId: null,
        seoMetadata: { title: 'SEO', description: 'Description' },
        tags: ['tech'],
        category: null,
        parentId: null,
        scheduledAt: NOW.toISOString(),
      },
      editorId: data.editorId,
      createdAt: NOW,
    });

    expect(domain.versionNo).toBe(1);
    expect(domain.snapshot).toMatchObject({ title: 'Title' });
  });

  it('maps legacy nested snapshot shapes and invalid optional values', () => {
    const domain = ContentVersionPersistenceMapper.toDomain({
      id: 'version-2',
      contentId: ID,
      versionNo: 2,
      snapshot: {
        title: 'Nested',
        slug: { value: 'nested' },
        body: { nodes: { type: 'doc' } },
        featuredImageId: 123,
        socialImageId: 456,
        seoMetadata: 'invalid',
        tags: 'invalid',
        category: null,
        parentId: null,
        scheduledAt: null,
      },
      editorId: 'editor-1',
      createdAt: NOW,
    });

    const snapshot = domain.snapshot as ContentSnapshot;

    expect(snapshot.slug.value).toBe('nested');
    expect(snapshot.body?.nodes).toEqual({ type: 'doc' });
    expect(snapshot.featuredImageId).toBeNull();
    expect(snapshot.seoMetadata.description).toBe('');
    expect(snapshot.tags).toHaveLength(0);
  });

  it('defaults malformed snapshot scalar fields', () => {
    const domain = ContentVersionPersistenceMapper.toDomain({
      id: 'version-4',
      contentId: ID,
      versionNo: 4,
      snapshot: {
        title: 123,
        slug: 'fallback',
        body: 'invalid',
        featuredImageId: 123,
        socialImageId: 456,
        seoMetadata: { title: 123, description: 456 },
        tags: ['tech'],
        category: 789,
        parentId: 101,
        scheduledAt: 112,
      },
      editorId: 'editor-1',
      createdAt: NOW,
    });

    const snapshot = domain.snapshot as ContentSnapshot;

    expect(snapshot.title).toBe('');
    expect(snapshot.body).toBeNull();
    expect(snapshot.seoMetadata.title).toBe('');
    expect(snapshot.category).toBeNull();
    expect(snapshot.scheduledAt).toBeNull();
  });

  it('maps snapshot nullable strings when present and defaults missing SEO', () => {
    const domain = ContentVersionPersistenceMapper.toDomain({
      id: 'version-5',
      contentId: ID,
      versionNo: 5,
      snapshot: {
        title: 'Optional fields',
        slug: 'optional-fields',
        body: null,
        featuredImageId: 'feature-1',
        socialImageId: 'social-1',
        tags: [],
        category: 'News',
        parentId: 'parent-1',
        scheduledAt: null,
      },
      editorId: 'editor-1',
      createdAt: NOW,
    });

    const snapshot = domain.snapshot as ContentSnapshot;

    expect(snapshot.featuredImageId).toBe('feature-1');
    expect(snapshot.socialImageId).toBe('social-1');
    expect(snapshot.seoMetadata.title).toBe('');
    expect(snapshot.parentId).toBe('parent-1');
  });

  it('throws for malformed content version snapshots', () => {
    expect(() =>
      ContentVersionPersistenceMapper.toDomain({
        id: 'version-3',
        contentId: ID,
        versionNo: 3,
        snapshot: 'invalid',
        editorId: 'editor-1',
        createdAt: NOW,
      }),
    ).toThrow('Invalid content version snapshot');
  });
});
