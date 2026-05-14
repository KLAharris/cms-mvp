import { describe, expect, it } from 'vitest';

import { Content } from '../../domain/entities/content.entity';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';
import { ContentType } from '../../domain/value-objects/content-type.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { ContentAccessPolicy } from './content-access.policy';

function content(status: ContentStatus, authorId = 'author-1'): Content {
  return Content.reconstitute({
    id: ContentId.create('123e4567-e89b-42d3-a456-426614174000'),
    type: ContentType.Article,
    title: 'Title',
    slug: Slug.create('title'),
    body: null,
    status,
    authorId,
    featuredImageId: null,
    socialImageId: null,
    seoMetadata: SeoMetadata.create('', ''),
    tags: [],
    category: null,
    parentId: null,
    scheduledAt: null,
    publishedAt: null,
    deletedAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  });
}

describe('ContentAccessPolicy', () => {
  it('canPublish allows admin and editor only', () => {
    expect(ContentAccessPolicy.canPublish('admin')).toBe(true);
    expect(ContentAccessPolicy.canPublish('editor')).toBe(true);
    expect(ContentAccessPolicy.canPublish('author')).toBe(false);
  });

  it('canSchedule allows admin and editor only', () => {
    expect(ContentAccessPolicy.canSchedule('admin')).toBe(true);
    expect(ContentAccessPolicy.canSchedule('editor')).toBe(true);
    expect(ContentAccessPolicy.canSchedule('author')).toBe(false);
  });

  it('canDelete returns true for admin', () => {
    expect(ContentAccessPolicy.canDelete('admin')).toBe(true);
  });

  it('canDelete returns false for editor', () => {
    expect(ContentAccessPolicy.canDelete('editor')).toBe(false);
  });

  it('canDelete returns false for author', () => {
    expect(ContentAccessPolicy.canDelete('author')).toBe(false);
  });

  it('canEdit follows role and ownership rules', () => {
    expect(ContentAccessPolicy.canEdit('admin', 'actor-1', 'author-1')).toBe(true);
    expect(ContentAccessPolicy.canEdit('editor', 'actor-1', 'author-1')).toBe(true);
    expect(ContentAccessPolicy.canEdit('author', 'author-1', 'author-1')).toBe(true);
    expect(ContentAccessPolicy.canEdit('author', 'author-2', 'author-1')).toBe(false);
    expect(ContentAccessPolicy.canEdit('viewer', 'author-1', 'author-1')).toBe(false);
  });

  it('canView follows role, ownership, and published visibility rules', () => {
    expect(ContentAccessPolicy.canView('admin', 'actor-1', content(ContentStatus.Draft))).toBe(true);
    expect(ContentAccessPolicy.canView('editor', 'actor-1', content(ContentStatus.Archived))).toBe(true);
    expect(ContentAccessPolicy.canView('author', 'author-1', content(ContentStatus.Draft))).toBe(true);
    expect(ContentAccessPolicy.canView('author', 'author-2', content(ContentStatus.Published))).toBe(true);
    expect(ContentAccessPolicy.canView('author', 'author-2', content(ContentStatus.Draft))).toBe(false);
    expect(ContentAccessPolicy.canView('viewer', 'author-1', content(ContentStatus.Published))).toBe(false);
  });

  it('canReject allows admin and editor only', () => {
    expect(ContentAccessPolicy.canReject('admin')).toBe(true);
    expect(ContentAccessPolicy.canReject('editor')).toBe(true);
    expect(ContentAccessPolicy.canReject('author')).toBe(false);
  });

  it('canRevert follows canEdit rules', () => {
    expect(ContentAccessPolicy.canRevert('admin', 'actor-1', 'author-1')).toBe(true);
    expect(ContentAccessPolicy.canRevert('editor', 'actor-1', 'author-1')).toBe(true);
    expect(ContentAccessPolicy.canRevert('author', 'author-1', 'author-1')).toBe(true);
    expect(ContentAccessPolicy.canRevert('author', 'author-2', 'author-1')).toBe(false);
  });
});
