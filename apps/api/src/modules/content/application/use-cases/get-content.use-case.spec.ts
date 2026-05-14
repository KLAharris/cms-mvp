import { describe, expect, it } from 'vitest';

import { Content } from '../../domain/entities/content.entity';
import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';
import { ContentType } from '../../domain/value-objects/content-type.vo';
import { RichTextBody } from '../../domain/value-objects/rich-text-body.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { Tag } from '../../domain/value-objects/tag.vo';
import { ContentRepository, PagedResult } from '../ports/out/content-repository.port';
import { GetContentUseCase } from './get-content.use-case';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const ID = '123e4567-e89b-42d3-a456-426614174000';

function content(status = ContentStatus.Draft, authorId = 'author-1', deletedAt: Date | null = null): Content {
  return Content.reconstitute({
    id: ContentId.create(ID), type: ContentType.Article, title: 'Title', slug: Slug.create('title'), body: RichTextBody.create({ type: 'doc' }), status, authorId,
    featuredImageId: 'feature-1', socialImageId: 'social-1', seoMetadata: SeoMetadata.create('SEO', 'Description'), tags: [Tag.create('tech')], category: 'News', parentId: null, scheduledAt: null,
    publishedAt: status === ContentStatus.Published ? NOW : null, deletedAt, createdAt: NOW, updatedAt: NOW,
  });
}

class FakeContents implements ContentRepository {
  entity: Content | null = content();
  save(): Promise<void> { throw new Error('not used'); }
  findById(): Promise<Content | null> { return Promise.resolve(this.entity); }
  findBySlug(): Promise<Content | null> { return Promise.resolve(null); }
  findMany(): Promise<PagedResult<Content>> { throw new Error('not used'); }
  delete(): Promise<void> { throw new Error('not used'); }
}

function setup(contents = new FakeContents()) {
  return new GetContentUseCase(contents, { run: (fn) => fn() });
}

describe('GetContentUseCase', () => {
  it.each(['editor', 'admin'])('returns full content for %s', async (actorRole) => {
    const result = await setup().execute({ contentId: ID, actorId: `${actorRole}-1`, actorRole });
    expect(result).toMatchObject({ contentId: ID, title: 'Title', tags: ['tech'], featuredImageId: 'feature-1' });
  });

  it('allows author to get own draft and another author published content', async () => {
    await expect(setup().execute({ contentId: ID, actorId: 'author-1', actorRole: 'author' })).resolves.toMatchObject({ status: ContentStatus.Draft });
    const contents = new FakeContents();
    contents.entity = content(ContentStatus.Published, 'author-2');
    await expect(setup(contents).execute({ contentId: ID, actorId: 'author-1', actorRole: 'author' })).resolves.toMatchObject({ status: ContentStatus.Published });
  });

  it('throws ContentNotFoundError if missing or soft-deleted', async () => {
    const missing = new FakeContents();
    missing.entity = null;
    await expect(setup(missing).execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor' })).rejects.toThrow(ContentNotFoundError);
    const deleted = new FakeContents();
    deleted.entity = content(ContentStatus.Draft, 'author-1', NOW);
    await expect(setup(deleted).execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor' })).rejects.toThrow(ContentNotFoundError);
  });

  it('throws ContentForbiddenError for another author draft', async () => {
    const contents = new FakeContents();
    contents.entity = content(ContentStatus.Draft, 'author-2');
    await expect(setup(contents).execute({ contentId: ID, actorId: 'author-1', actorRole: 'author' })).rejects.toThrow(ContentForbiddenError);
  });
});
