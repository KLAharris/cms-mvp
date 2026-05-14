import { describe, expect, it } from 'vitest';

import { Content } from '../../domain/entities/content.entity';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';
import { ContentType } from '../../domain/value-objects/content-type.vo';
import { RichTextBody } from '../../domain/value-objects/rich-text-body.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { Tag } from '../../domain/value-objects/tag.vo';
import {
  contentSnapshot,
  toContentListItem,
  toGetContentResult,
  updateFieldsFromCommand,
} from './content-mappers';

const NOW = new Date('2026-06-01T00:00:00.000Z');

function content(body: RichTextBody | null = RichTextBody.create({ type: 'doc' })): Content {
  return Content.reconstitute({
    id: ContentId.create('123e4567-e89b-42d3-a456-426614174000'),
    type: ContentType.Article,
    title: 'Title',
    slug: Slug.create('title'),
    body,
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

describe('content mappers', () => {
  it('builds content snapshots and DTOs', () => {
    const entity = content();

    expect(contentSnapshot(entity)).toMatchObject({ title: 'Title' });
    expect(toContentListItem(entity)).toMatchObject({
      id: entity.id.value,
      slug: 'title',
      authorId: 'author-1',
    });
    expect(toGetContentResult(entity)).toMatchObject({
      contentId: entity.id.value,
      body: { type: 'doc' },
      tags: ['tech'],
    });
    expect(toGetContentResult(content(null))).toMatchObject({ body: null });
  });

  it('builds update fields from every command field', () => {
    const fields = updateFieldsFromCommand({
      contentId: '123e4567-e89b-42d3-a456-426614174000',
      actorId: 'author-1',
      actorRole: 'author',
      title: 'Updated',
      slug: 'updated',
      body: { type: 'doc' },
      seoMetadata: { title: 'SEO', description: 'Description' },
      tags: ['Tech'],
      category: 'News',
      parentId: 'parent-1',
      featuredImageId: 'feature-1',
      socialImageId: 'social-1',
    });

    expect(fields.title).toBe('Updated');
    expect(fields.slug?.value).toBe('updated');
    expect(fields.body?.nodes).toEqual({ type: 'doc' });
    expect(fields.seoMetadata?.description).toBe('Description');
    expect(fields.tags?.[0]?.value).toBe('tech');
    expect(fields.category).toBe('News');
    expect(fields.parentId).toBe('parent-1');
    expect(fields.featuredImageId).toBe('feature-1');
    expect(fields.socialImageId).toBe('social-1');
  });

  it('maps null body update fields', () => {
    expect(
      updateFieldsFromCommand({
        contentId: '123e4567-e89b-42d3-a456-426614174000',
        actorId: 'author-1',
        actorRole: 'author',
        body: null,
      }).body,
    ).toBeNull();
  });
});
