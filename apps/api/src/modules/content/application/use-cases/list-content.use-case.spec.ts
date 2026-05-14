import { describe, expect, it } from 'vitest';

import { Content } from '../../domain/entities/content.entity';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';
import { ContentType } from '../../domain/value-objects/content-type.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { ContentRepository, ContentSearchCriteria, PagedResult } from '../ports/out/content-repository.port';
import { ListContentUseCase } from './list-content.use-case';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const ID = '123e4567-e89b-42d3-a456-426614174000';

function content(): Content {
  return Content.reconstitute({
    id: ContentId.create(ID), type: ContentType.Article, title: 'Title', slug: Slug.create('title'), body: null, status: ContentStatus.Draft, authorId: 'author-1',
    featuredImageId: null, socialImageId: null, seoMetadata: SeoMetadata.create('', ''), tags: [], category: null, parentId: null, scheduledAt: null,
    publishedAt: null, deletedAt: null, createdAt: NOW, updatedAt: NOW,
  });
}

class FakeContents implements ContentRepository {
  criteria: ContentSearchCriteria | null = null;
  async save(): Promise<void> { throw new Error('not used'); }
  async findById(): Promise<Content | null> { return null; }
  async findBySlug(): Promise<Content | null> { return null; }
  async findMany(criteria: ContentSearchCriteria): Promise<PagedResult<Content>> {
    this.criteria = criteria;
    return { items: [content()], total: 1, page: criteria.page, pageSize: criteria.pageSize, totalPages: 1 };
  }
  async delete(): Promise<void> { throw new Error('not used'); }
}

function setup(contents = new FakeContents()) {
  return { contents, useCase: new ListContentUseCase(contents, { run: async (fn) => fn() }) };
}

describe('ListContentUseCase', () => {
  it('returns PagedResult with defaults', async () => {
    const state = setup();
    const result = await state.useCase.execute({ actorId: 'editor-1', actorRole: 'editor' });
    expect(result).toMatchObject({ total: 1, page: 1, pageSize: 25, totalPages: 1 });
    expect(result.items[0]).toMatchObject({ id: ID, authorId: 'author-1' });
  });

  it('forces authorId to actorId for authors', async () => {
    const state = setup();
    await state.useCase.execute({ actorId: 'author-1', actorRole: 'author', authorId: 'other-author' });
    expect(state.contents.criteria?.authorId).toBe('author-1');
  });

  it.each(['editor', 'admin'])('does not override authorId for %s', async (actorRole) => {
    const state = setup();
    await state.useCase.execute({ actorId: `${actorRole}-1`, actorRole, authorId: 'author-2' });
    expect(state.contents.criteria?.authorId).toBe('author-2');
  });

  it('caps pageSize at 100 and defaults page below 1', async () => {
    const state = setup();
    await state.useCase.execute({ actorId: 'admin-1', actorRole: 'admin', page: 0, pageSize: 999 });
    expect(state.contents.criteria?.page).toBe(1);
    expect(state.contents.criteria?.pageSize).toBe(100);
  });

  it('keeps valid page and pageSize values', async () => {
    const state = setup();
    await state.useCase.execute({ actorId: 'admin-1', actorRole: 'admin', page: 3, pageSize: 50 });
    expect(state.contents.criteria?.page).toBe(3);
    expect(state.contents.criteria?.pageSize).toBe(50);
  });
});
