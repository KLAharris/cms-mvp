import { describe, expect, it } from 'vitest';

import { ContentDeleted } from '../events/content-deleted.event';
import { ContentPublished } from '../events/content-published.event';
import { ContentUnpublished } from '../events/content-unpublished.event';
import { InvalidTransitionError } from '../errors/invalid-transition.error';
import { ScheduledAtInPastError } from '../errors/scheduled-at-in-past.error';
import { ContentId } from '../value-objects/content-id.vo';
import { ContentStatus } from '../value-objects/content-status.vo';
import { ContentType } from '../value-objects/content-type.vo';
import { RichTextBody } from '../value-objects/rich-text-body.vo';
import { SeoMetadata } from '../value-objects/seo-metadata.vo';
import { Slug } from '../value-objects/slug.vo';
import { Tag } from '../value-objects/tag.vo';
import { Content, ContentReconstituteProps } from './content.entity';

const id = ContentId.create('123e4567-e89b-42d3-a456-426614174000');
const createdAt = new Date('2026-05-14T00:00:00.000Z');
const now = new Date('2026-05-14T01:00:00.000Z');

function createContent(): Content {
  return Content.create({
    id,
    type: ContentType.Article,
    title: 'Title',
    slug: Slug.create('title'),
    authorId: 'author-1',
    seoMetadata: SeoMetadata.create('', ''),
    createdAt,
  });
}

function reconstitute(status: ContentStatus, overrides: Partial<ContentReconstituteProps> = {}): Content {
  return Content.reconstitute({
    id,
    type: ContentType.Article,
    title: 'Title',
    slug: Slug.create('title'),
    body: null,
    status,
    authorId: 'author-1',
    featuredImageId: null,
    socialImageId: null,
    seoMetadata: SeoMetadata.create('', ''),
    tags: [],
    category: null,
    parentId: null,
    scheduledAt: null,
    publishedAt: null,
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  });
}

describe('Content', () => {
  it('create() sets draft defaults', () => {
    const content = createContent();

    expect(content.status).toBe(ContentStatus.Draft);
    expect(content.publishedAt).toBeNull();
    expect(content.scheduledAt).toBeNull();
    expect(content.deletedAt).toBeNull();
    expect(content.tags).toEqual([]);
    expect(content.updatedAt).toBe(createdAt);
  });

  it('submit() transitions Draft and Unpublished to InReview', () => {
    const draft = reconstitute(ContentStatus.Draft);
    const unpublished = reconstitute(ContentStatus.Unpublished);

    draft.submit('actor-1', now);
    unpublished.submit('actor-1', now);

    expect(draft.status).toBe(ContentStatus.InReview);
    expect(unpublished.status).toBe(ContentStatus.InReview);
    expect(draft.updatedAt).toBe(now);
  });

  it.each([
    ContentStatus.InReview,
    ContentStatus.Published,
    ContentStatus.Archived,
  ])('submit() throws from %s', (status) => {
    expect(() => { reconstitute(status).submit('actor-1', now); }).toThrow(
      InvalidTransitionError,
    );
  });

  it('publish() transitions InReview and Draft to Published and emits event', () => {
    const inReview = reconstitute(ContentStatus.InReview);
    const draft = reconstitute(ContentStatus.Draft);

    inReview.publish('actor-1', now);
    draft.publish('actor-1', now);

    expect(inReview.status).toBe(ContentStatus.Published);
    expect(draft.status).toBe(ContentStatus.Published);
    expect(inReview.publishedAt).toBe(now);
    expect(draft.pullDomainEvents()[0]).toBeInstanceOf(ContentPublished);
  });

  it('publish() does not reset publishedAt if it already exists', () => {
    const publishedAt = new Date('2026-05-13T00:00:00.000Z');
    const content = reconstitute(ContentStatus.Draft, { publishedAt });

    content.publish('actor-1', now);

    expect(content.publishedAt).toBe(publishedAt);
  });

  it.each([
    ContentStatus.Published,
    ContentStatus.Unpublished,
    ContentStatus.Archived,
  ])('publish() throws from %s', (status) => {
    expect(() => { reconstitute(status).publish('actor-1', now); }).toThrow(
      InvalidTransitionError,
    );
  });

  it('reject() transitions InReview to Draft', () => {
    const content = reconstitute(ContentStatus.InReview);

    content.reject('actor-1', now);

    expect(content.status).toBe(ContentStatus.Draft);
    expect(content.updatedAt).toBe(now);
  });

  it.each([
    ContentStatus.Draft,
    ContentStatus.Published,
    ContentStatus.Unpublished,
    ContentStatus.Archived,
  ])('reject() throws from %s', (status) => {
    expect(() => { reconstitute(status).reject('actor-1', now); }).toThrow(
      InvalidTransitionError,
    );
  });

  it('unpublish() transitions Published to Unpublished and emits event', () => {
    const content = reconstitute(ContentStatus.Published);

    content.unpublish('actor-1', now);

    expect(content.status).toBe(ContentStatus.Unpublished);
    expect(content.pullDomainEvents()[0]).toBeInstanceOf(ContentUnpublished);
  });

  it.each([ContentStatus.Draft, ContentStatus.InReview, ContentStatus.Archived])(
    'unpublish() throws from %s',
    (status) => {
      expect(() => { reconstitute(status).unpublish('actor-1', now); }).toThrow(
        InvalidTransitionError,
      );
    },
  );

  it('archive() transitions Unpublished to Archived', () => {
    const content = reconstitute(ContentStatus.Unpublished);

    content.archive('actor-1', now);

    expect(content.status).toBe(ContentStatus.Archived);
  });

  it.each([ContentStatus.Draft, ContentStatus.Published, ContentStatus.InReview])(
    'archive() throws from %s',
    (status) => {
      expect(() => { reconstitute(status).archive('actor-1', now); }).toThrow(
        InvalidTransitionError,
      );
    },
  );

  it('softDelete() sets deletedAt and emits event from Draft and Published', () => {
    const draft = reconstitute(ContentStatus.Draft);
    const published = reconstitute(ContentStatus.Published);

    draft.softDelete('actor-1', now);
    published.softDelete('actor-1', now);

    expect(draft.deletedAt).toBe(now);
    expect(published.deletedAt).toBe(now);
    expect(draft.pullDomainEvents()[0]).toBeInstanceOf(ContentDeleted);
  });

  it('softDelete() throws on second delete', () => {
    const content = reconstitute(ContentStatus.Draft);

    content.softDelete('actor-1', now);

    expect(() => { content.softDelete('actor-1', now); }).toThrow(
      InvalidTransitionError,
    );
  });

  it('schedulePublish() sets scheduledAt on Draft and InReview with future timestamp', () => {
    const future = new Date('2026-05-15T00:00:00.000Z');
    const draft = reconstitute(ContentStatus.Draft);
    const inReview = reconstitute(ContentStatus.InReview);

    draft.schedulePublish(future, 'actor-1', now);
    inReview.schedulePublish(future, 'actor-1', now);

    expect(draft.scheduledAt).toBe(future);
    expect(inReview.scheduledAt).toBe(future);
  });

  it.each([
    new Date('2026-05-14T01:00:00.000Z'),
    new Date('2026-05-14T00:59:59.999Z'),
  ])('schedulePublish() throws when scheduledAt is not future', (scheduledAt) => {
    expect(() => {
      reconstitute(ContentStatus.Draft).schedulePublish(scheduledAt, 'actor-1', now);
    }).toThrow(ScheduledAtInPastError);
  });

  it.each([
    ContentStatus.Published,
    ContentStatus.Unpublished,
    ContentStatus.Archived,
  ])('schedulePublish() throws from %s', (status) => {
    expect(() => {
      reconstitute(status).schedulePublish(new Date('2026-05-15T00:00:00.000Z'), 'actor-1', now);
    }).toThrow(InvalidTransitionError);
  });

  it('update() updates fields, leaves unprovided fields unchanged, and sets updatedAt', () => {
    const content = reconstitute(ContentStatus.Draft);
    const body = RichTextBody.create({ type: 'doc' });
    const seoMetadata = SeoMetadata.create('seo', 'desc');
    const tag = Tag.create('tech');
    const future = new Date('2026-05-15T00:00:00.000Z');

    content.update(
      {
        title: 'Updated',
        slug: Slug.create('updated'),
        body,
        featuredImageId: 'featured-1',
        socialImageId: 'social-1',
        seoMetadata,
        tags: [tag],
        category: 'News',
        parentId: 'parent-1',
        scheduledAt: future,
      },
      now,
    );

    expect(content.title).toBe('Updated');
    expect(content.slug.value).toBe('updated');
    expect(content.body).toBe(body);
    expect(content.featuredImageId).toBe('featured-1');
    expect(content.socialImageId).toBe('social-1');
    expect(content.seoMetadata).toBe(seoMetadata);
    expect(content.tags).toEqual([tag]);
    expect(content.category).toBe('News');
    expect(content.parentId).toBe('parent-1');
    expect(content.scheduledAt).toBe(future);
    expect(content.updatedAt).toBe(now);
    expect(content.authorId).toBe('author-1');
  });

  it('update() is allowed from Unpublished', () => {
    const content = reconstitute(ContentStatus.Unpublished);

    content.update({ title: 'Updated' }, now);

    expect(content.title).toBe('Updated');
  });

  it.each([
    ContentStatus.InReview,
    ContentStatus.Published,
    ContentStatus.Archived,
  ])('update() throws from %s', (status) => {
    expect(() => { reconstitute(status).update({ title: 'Updated' }, now); }).toThrow(
      InvalidTransitionError,
    );
  });

  it('applyVersionSnapshot() is allowed from Draft and Unpublished and sets updatedAt', () => {
    const draft = reconstitute(ContentStatus.Draft);
    const unpublished = reconstitute(ContentStatus.Unpublished);
    const snapshot = {
      title: 'Snapshot',
      slug: Slug.create('snapshot'),
      body: RichTextBody.create({ type: 'doc' }),
      featuredImageId: null,
      socialImageId: null,
      seoMetadata: SeoMetadata.create('seo', 'desc'),
      tags: [Tag.create('tech')],
      category: 'News',
      parentId: null,
      scheduledAt: null,
    };

    draft.applyVersionSnapshot(snapshot, 'editor-1', now);
    unpublished.applyVersionSnapshot(snapshot, 'editor-1', now);

    expect(draft.title).toBe('Snapshot');
    expect(unpublished.title).toBe('Snapshot');
    expect(draft.updatedAt).toBe(now);
  });

  it.each([
    ContentStatus.InReview,
    ContentStatus.Published,
    ContentStatus.Archived,
  ])('applyVersionSnapshot() throws from %s', (status) => {
    const snapshot = {
      title: 'Snapshot',
      slug: Slug.create('snapshot'),
      body: null,
      featuredImageId: null,
      socialImageId: null,
      seoMetadata: SeoMetadata.create('', ''),
      tags: [],
      category: null,
      parentId: null,
      scheduledAt: null,
    };

    expect(() => {
      reconstitute(status).applyVersionSnapshot(snapshot, 'editor-1', now);
    }).toThrow(InvalidTransitionError);
  });

  it('pullDomainEvents() returns accumulated events and clears them', () => {
    const content = reconstitute(ContentStatus.Draft);

    content.publish('actor-1', now);
    content.unpublish('actor-1', now);
    content.softDelete('actor-1', now);

    const events = content.pullDomainEvents();

    expect(events).toHaveLength(3);
    expect(events[0]).toBeInstanceOf(ContentPublished);
    expect(events[1]).toBeInstanceOf(ContentUnpublished);
    expect(events[2]).toBeInstanceOf(ContentDeleted);
    expect(content.pullDomainEvents()).toEqual([]);
  });

  it('pullDomainEvents() returns empty when no events raised', () => {
    expect(createContent().pullDomainEvents()).toEqual([]);
  });
});
