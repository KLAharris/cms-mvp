import { describe, expect, it } from 'vitest';

import { Content, ContentSnapshot } from '../../domain/entities/content.entity';
import { ContentVersion } from '../../domain/entities/content-version.entity';
import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { InvalidTransitionError } from '../../domain/errors/invalid-transition.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';
import { ContentType } from '../../domain/value-objects/content-type.vo';
import { RichTextBody } from '../../domain/value-objects/rich-text-body.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { Tag } from '../../domain/value-objects/tag.vo';
import { ContentRepository, PagedResult } from '../ports/out/content-repository.port';
import { ContentVersionRepository } from '../ports/out/content-version-repository.port';
import { RevertContentUseCase } from './revert-content.use-case';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const ID = '123e4567-e89b-42d3-a456-426614174000';
const VERSION_ID = '223e4567-e89b-42d3-a456-426614174000';

function content(status = ContentStatus.Draft, authorId = 'author-1'): Content {
  return Content.reconstitute({
    id: ContentId.create(ID), type: ContentType.Article, title: 'Current', slug: Slug.create('current'), body: null, status, authorId,
    featuredImageId: null, socialImageId: null, seoMetadata: SeoMetadata.create('', ''), tags: [], category: null, parentId: null, scheduledAt: null,
    publishedAt: null, deletedAt: null, createdAt: NOW, updatedAt: NOW,
  });
}

function snapshot(): ContentSnapshot {
  return {
    title: 'Prior',
    slug: Slug.create('prior'),
    body: RichTextBody.create({ type: 'doc' }),
    featuredImageId: 'feature-1',
    socialImageId: 'social-1',
    seoMetadata: SeoMetadata.create('SEO', 'Description'),
    tags: [Tag.create('tech')],
    category: 'News',
    parentId: null,
    scheduledAt: null,
  };
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

class FakeVersions implements ContentVersionRepository {
  saved: ContentVersion[] = [];
  version: ContentVersion | null = ContentVersion.create({
    id: 'version-1',
    contentId: ContentId.create(ID),
    versionNo: 1,
    snapshot: snapshot(),
    editorId: 'author-1',
    createdAt: NOW,
  });
  save(version: ContentVersion): Promise<void> { this.saved.push(version); return Promise.resolve(); }
  findByContentId(): Promise<ContentVersion[]> { return Promise.resolve(this.version === null ? [] : [this.version]); }
  findByVersionNo(): Promise<ContentVersion | null> { return Promise.resolve(this.version); }
  nextVersionNo(): Promise<number> { return Promise.resolve(3); }
}

function setup(contents = new FakeContents(), versions = new FakeVersions()) {
  return { contents, versions, useCase: new RevertContentUseCase(contents, versions, { generate: () => VERSION_ID }, { now: () => NOW }, { run: (fn) => fn() }) };
}

describe('RevertContentUseCase', () => {
  it('applies snapshot and creates a new monotonic version', async () => {
    const state = setup();
    await expect(state.useCase.execute({ contentId: ID, versionNo: 1, actorId: 'author-1', actorRole: 'author' })).resolves.toEqual({
      contentId: ID,
      newVersionNo: 3,
      status: ContentStatus.Draft,
    });
    expect(state.contents.saved[0]?.title).toBe('Prior');
    expect(state.versions.saved[0]?.versionNo).toBe(3);
  });

  it('throws ContentNotFoundError if content is missing', async () => {
    const contents = new FakeContents();
    contents.entity = null;
    await expect(setup(contents).useCase.execute({ contentId: ID, versionNo: 1, actorId: 'author-1', actorRole: 'author' })).rejects.toThrow(ContentNotFoundError);
  });

  it('throws ContentNotFoundError if requested version is missing', async () => {
    const versions = new FakeVersions();
    versions.version = null;
    await expect(setup(new FakeContents(), versions).useCase.execute({ contentId: ID, versionNo: 99, actorId: 'author-1', actorRole: 'author' })).rejects.toThrow(ContentNotFoundError);
  });

  it('throws ContentForbiddenError for another author', async () => {
    await expect(setup().useCase.execute({ contentId: ID, versionNo: 1, actorId: 'author-2', actorRole: 'author' })).rejects.toThrow(ContentForbiddenError);
  });

  it.each([ContentStatus.InReview, ContentStatus.Published, ContentStatus.Archived])('throws InvalidTransitionError from %s', async (status) => {
    const contents = new FakeContents();
    contents.entity = content(status);
    await expect(setup(contents).useCase.execute({ contentId: ID, versionNo: 1, actorId: 'editor-1', actorRole: 'editor' })).rejects.toThrow(InvalidTransitionError);
  });
});
