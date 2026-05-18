import { describe, expect, it } from 'vitest';

import { FakeAuditRepository } from '../../../audit/tests/doubles/fake-audit.repository';
import { Content } from '../../domain/entities/content.entity';
import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { InvalidTransitionError } from '../../domain/errors/invalid-transition.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';
import { ContentType } from '../../domain/value-objects/content-type.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { ContentRepository, PagedResult } from '../ports/out/content-repository.port';
import { SubmitForReviewUseCase } from './submit-for-review.use-case';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const ID = '123e4567-e89b-42d3-a456-426614174000';

function content(status = ContentStatus.Draft, authorId = 'author-1'): Content {
  return Content.reconstitute({
    id: ContentId.create(ID),
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
    createdAt: NOW,
    updatedAt: NOW,
  });
}

class FakeContents implements ContentRepository {
  saved: Content[] = [];
  entity: Content | null = content();
  save(entity: Content): Promise<void> { this.saved.push(entity); return Promise.resolve(); }
  findById(): Promise<Content | null> { return Promise.resolve(this.entity); }
  findBySlug(): Promise<Content | null> { return Promise.resolve(null); }
  findMany(): Promise<PagedResult<Content>> { throw new Error('not used'); }
  delete(): Promise<void> { throw new Error('not used'); }
}

function useCase(contents = new FakeContents()) {
  return new SubmitForReviewUseCase(
    contents,
    { now: () => NOW },
    { run: (fn) => fn() },
    new FakeAuditRepository(),
  );
}

describe('SubmitForReviewUseCase', () => {
  it.each([ContentStatus.Draft, ContentStatus.Unpublished])('transitions %s to InReview', async (status) => {
    const contents = new FakeContents();
    contents.entity = content(status);

    await expect(useCase(contents).execute({ contentId: ID, actorId: 'author-1', actorRole: 'author' })).resolves.toEqual({
      contentId: ID,
      status: ContentStatus.InReview,
    });
  });

  it('throws ContentNotFoundError if not found', async () => {
    const contents = new FakeContents();
    contents.entity = null;
    await expect(useCase(contents).execute({ contentId: ID, actorId: 'author-1', actorRole: 'author' })).rejects.toThrow(ContentNotFoundError);
  });

  it('throws ContentForbiddenError for another author', async () => {
    await expect(useCase().execute({ contentId: ID, actorId: 'author-2', actorRole: 'author' })).rejects.toThrow(ContentForbiddenError);
  });

  it.each([ContentStatus.InReview, ContentStatus.Published])('throws InvalidTransitionError from %s', async (status) => {
    const contents = new FakeContents();
    contents.entity = content(status);
    await expect(useCase(contents).execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor' })).rejects.toThrow(InvalidTransitionError);
  });
});
