import { describe, expect, it, vi } from 'vitest';

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
import { DeleteContentUseCase } from './delete-content.use-case';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const ID = '123e4567-e89b-42d3-a456-426614174000';

function content(deletedAt: Date | null = null): Content {
  return Content.reconstitute({
    id: ContentId.create(ID), type: ContentType.Article, title: 'Title', slug: Slug.create('title'), body: null, status: ContentStatus.Draft, authorId: 'author-1',
    featuredImageId: null, socialImageId: null, seoMetadata: SeoMetadata.create('', ''), tags: [], category: null, parentId: null, scheduledAt: null,
    publishedAt: null, deletedAt, createdAt: NOW, updatedAt: NOW,
  });
}

class FakeContents implements ContentRepository {
  saved: Content[] = [];
  deleted: ContentId[] = [];
  entity: Content | null = content();
  save(entity: Content): Promise<void> { this.saved.push(entity); return Promise.resolve(); }
  findById(): Promise<Content | null> { return Promise.resolve(this.entity); }
  findBySlug(): Promise<Content | null> { return Promise.resolve(null); }
  findMany(): Promise<PagedResult<Content>> { throw new Error('not used'); }
  delete(id: ContentId): Promise<void> { this.deleted.push(id); return Promise.resolve(); }
}

function setup(contents = new FakeContents()) {
  const events = { publishAll: vi.fn(() => Promise.resolve()) };
  return { contents, events, useCase: new DeleteContentUseCase(contents, { now: () => NOW }, events, { run: (fn) => fn() }) };
}

describe('DeleteContentUseCase', () => {
  it('soft-deletes without hard delete and publishes event', async () => {
    const state = setup();
    await expect(state.useCase.execute({ contentId: ID, actorId: 'admin-1', actorRole: 'admin' })).resolves.toEqual({ contentId: ID, deletedAt: NOW });
    expect(state.contents.saved[0]?.deletedAt).toBe(NOW);
    expect(state.contents.deleted).toEqual([]);
    expect(state.events.publishAll).toHaveBeenCalledWith([expect.objectContaining({ actorId: 'admin-1' })]);
  });

  it('throws ContentNotFoundError if not found', async () => {
    const contents = new FakeContents();
    contents.entity = null;
    await expect(setup(contents).useCase.execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor' })).rejects.toThrow(ContentNotFoundError);
  });

  it('throws ContentForbiddenError for author', async () => {
    await expect(setup().useCase.execute({ contentId: ID, actorId: 'author-1', actorRole: 'author' })).rejects.toThrow(ContentForbiddenError);
  });

  it('throws InvalidTransitionError if already deleted', async () => {
    const contents = new FakeContents();
    contents.entity = content(NOW);
    await expect(setup(contents).useCase.execute({ contentId: ID, actorId: 'admin-1', actorRole: 'admin' })).rejects.toThrow(InvalidTransitionError);
  });
});
