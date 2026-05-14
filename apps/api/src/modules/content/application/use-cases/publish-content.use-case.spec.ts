import { describe, expect, it, vi } from 'vitest';

import { Content } from '../../domain/entities/content.entity';
import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { InvalidTransitionError } from '../../domain/errors/invalid-transition.error';
import { PublishValidationError } from '../../domain/errors/publish-validation.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';
import { ContentType } from '../../domain/value-objects/content-type.vo';
import { RichTextBody } from '../../domain/value-objects/rich-text-body.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { ContentRepository, PagedResult } from '../ports/out/content-repository.port';
import { PublishContentUseCase } from './publish-content.use-case';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const ID = '123e4567-e89b-42d3-a456-426614174000';

function content(status = ContentStatus.InReview, overrides: Partial<{ title: string; body: RichTextBody | null; seoMetadata: SeoMetadata }> = {}): Content {
  return Content.reconstitute({
    id: ContentId.create(ID),
    type: ContentType.Article,
    title: overrides.title ?? 'Title',
    slug: Slug.create('title'),
    body: 'body' in overrides ? overrides.body ?? null : RichTextBody.create({ type: 'doc' }),
    status,
    authorId: 'author-1',
    featuredImageId: null,
    socialImageId: null,
    seoMetadata: overrides.seoMetadata ?? SeoMetadata.create('', 'Description'),
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
  async save(entity: Content): Promise<void> { this.saved.push(entity); }
  async findById(): Promise<Content | null> { return this.entity; }
  async findBySlug(): Promise<Content | null> { return null; }
  async findMany(): Promise<PagedResult<Content>> { throw new Error('not used'); }
  async delete(): Promise<void> { throw new Error('not used'); }
}

function setup(contents = new FakeContents()) {
  const events = { publishAll: vi.fn(async () => undefined) };
  return { events, useCase: new PublishContentUseCase(contents, { now: () => NOW }, events, { run: async (fn) => fn() }) };
}

describe('PublishContentUseCase', () => {
  it.each([ContentStatus.InReview, ContentStatus.Draft])('transitions %s to Published and publishes event', async (status) => {
    const contents = new FakeContents();
    contents.entity = content(status);
    const state = setup(contents);

    const result = await state.useCase.execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor' });

    expect(result).toEqual({ contentId: ID, status: ContentStatus.Published, publishedAt: NOW });
    expect(contents.saved[0]?.publishedAt).toBe(NOW);
    expect(state.events.publishAll).toHaveBeenCalledWith([expect.objectContaining({ actorId: 'editor-1' })]);
  });

  it('throws ContentNotFoundError if not found', async () => {
    const contents = new FakeContents();
    contents.entity = null;
    await expect(setup(contents).useCase.execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor' })).rejects.toThrow(ContentNotFoundError);
  });

  it('throws ContentForbiddenError for author', async () => {
    await expect(setup().useCase.execute({ contentId: ID, actorId: 'author-1', actorRole: 'author' })).rejects.toThrow(ContentForbiddenError);
  });

  it.each([
    content(ContentStatus.InReview, { title: '' }),
    content(ContentStatus.InReview, { body: null }),
    content(ContentStatus.InReview, { seoMetadata: SeoMetadata.create('', '') }),
  ])('throws PublishValidationError for invalid publishable fields', async (entity) => {
    const contents = new FakeContents();
    contents.entity = entity;
    await expect(setup(contents).useCase.execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor' })).rejects.toThrow(PublishValidationError);
  });

  it('throws InvalidTransitionError if already published', async () => {
    const contents = new FakeContents();
    contents.entity = content(ContentStatus.Published);
    await expect(setup(contents).useCase.execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor' })).rejects.toThrow(InvalidTransitionError);
  });
});
