import { describe, expect, it } from 'vitest';

import { Content } from '../../domain/entities/content.entity';
import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { InvalidTransitionError } from '../../domain/errors/invalid-transition.error';
import { ScheduledAtInPastError } from '../../domain/errors/scheduled-at-in-past.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';
import { ContentType } from '../../domain/value-objects/content-type.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { ContentRepository, PagedResult } from '../ports/out/content-repository.port';
import { ScheduleContentUseCase } from './schedule-content.use-case';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const FUTURE = new Date('2026-07-01T00:00:00.000Z');
const ID = '123e4567-e89b-42d3-a456-426614174000';

function content(status = ContentStatus.Draft): Content {
  return Content.reconstitute({
    id: ContentId.create(ID), type: ContentType.Article, title: 'Title', slug: Slug.create('title'), body: null, status, authorId: 'author-1',
    featuredImageId: null, socialImageId: null, seoMetadata: SeoMetadata.create('', ''), tags: [], category: null, parentId: null, scheduledAt: null,
    publishedAt: null, deletedAt: null, createdAt: NOW, updatedAt: NOW,
  });
}

class FakeContents implements ContentRepository {
  saved: Content[] = [];
  entity: Content | null = content();
  async save(entity: Content): Promise<void> { this.saved.push(entity); }
  async findById(): Promise<Content | null> { return this.entity; }
  async findBySlug(): Promise<Content | null> { return null; }
  async findMany(): Promise<PagedResult<Content>> { throw new Error('not used'); }
  async delete(): Promise<void> { throw new Error('not used'); }
}

function setup(contents = new FakeContents()) {
  return new ScheduleContentUseCase(contents, { now: () => NOW }, { run: async (fn) => fn() });
}

describe('ScheduleContentUseCase', () => {
  it.each([ContentStatus.Draft, ContentStatus.InReview])('sets scheduledAt on %s', async (status) => {
    const contents = new FakeContents();
    contents.entity = content(status);
    await expect(setup(contents).execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor', scheduledAt: FUTURE })).resolves.toEqual({ contentId: ID, status, scheduledAt: FUTURE });
  });

  it('throws ContentNotFoundError if not found', async () => {
    const contents = new FakeContents();
    contents.entity = null;
    await expect(setup(contents).execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor', scheduledAt: FUTURE })).rejects.toThrow(ContentNotFoundError);
  });

  it('throws ContentForbiddenError for author', async () => {
    await expect(setup().execute({ contentId: ID, actorId: 'author-1', actorRole: 'author', scheduledAt: FUTURE })).rejects.toThrow(ContentForbiddenError);
  });

  it.each([NOW, new Date('2026-05-31T00:00:00.000Z')])('throws ScheduledAtInPastError when not future', async (scheduledAt) => {
    await expect(setup().execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor', scheduledAt })).rejects.toThrow(ScheduledAtInPastError);
  });

  it.each([ContentStatus.Published, ContentStatus.Unpublished, ContentStatus.Archived])('throws InvalidTransitionError from %s', async (status) => {
    const contents = new FakeContents();
    contents.entity = content(status);
    await expect(setup(contents).execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor', scheduledAt: FUTURE })).rejects.toThrow(InvalidTransitionError);
  });
});
