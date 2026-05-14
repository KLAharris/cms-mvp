import { describe, expect, it } from 'vitest';

import { Content } from '../../domain/entities/content.entity';
import { ContentVersion } from '../../domain/entities/content-version.entity';
import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';
import { ContentType } from '../../domain/value-objects/content-type.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { ContentRepository, PagedResult } from '../ports/out/content-repository.port';
import { ContentVersionRepository } from '../ports/out/content-version-repository.port';
import { ListVersionsUseCase } from './list-versions.use-case';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const ID = '123e4567-e89b-42d3-a456-426614174000';

function content(authorId = 'author-1'): Content {
  return Content.reconstitute({
    id: ContentId.create(ID),
    type: ContentType.Article,
    title: 'Title',
    slug: Slug.create('title'),
    body: null,
    status: ContentStatus.Draft,
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
  entity: Content | null = content();
  save(): Promise<void> { throw new Error('not used'); }
  findById(): Promise<Content | null> { return Promise.resolve(this.entity); }
  findBySlug(): Promise<Content | null> { return Promise.resolve(null); }
  findMany(): Promise<PagedResult<Content>> { throw new Error('not used'); }
  delete(): Promise<void> { throw new Error('not used'); }
}

class FakeVersions implements ContentVersionRepository {
  rows = [
    ContentVersion.create({
      id: 'version-1',
      contentId: ContentId.create(ID),
      versionNo: 1,
      snapshot: {},
      editorId: 'editor-1',
      createdAt: NOW,
    }),
    ContentVersion.create({
      id: 'version-2',
      contentId: ContentId.create(ID),
      versionNo: 2,
      snapshot: {},
      editorId: 'editor-2',
      createdAt: new Date('2026-06-02T00:00:00.000Z'),
    }),
  ];
  save(): Promise<void> { throw new Error('not used'); }
  findByContentId(): Promise<ContentVersion[]> { return Promise.resolve(this.rows); }
  findByVersionNo(): Promise<ContentVersion | null> { return Promise.resolve(null); }
  nextVersionNo(): Promise<number> { return Promise.resolve(1); }
}

function setup(contents = new FakeContents(), versions = new FakeVersions()) {
  return new ListVersionsUseCase(contents, versions, { run: (fn) => fn() });
}

describe('ListVersionsUseCase', () => {
  it('returns versions sorted by versionNo desc', async () => {
    await expect(
      setup().execute({ contentId: ID, actorId: 'editor-1', actorRole: 'editor' }),
    ).resolves.toEqual({
      versions: [
        {
          versionNo: 2,
          editorId: 'editor-2',
          createdAt: new Date('2026-06-02T00:00:00.000Z'),
        },
        { versionNo: 1, editorId: 'editor-1', createdAt: NOW },
      ],
    });
  });

  it('allows author to list own content versions', async () => {
    await expect(
      setup().execute({ contentId: ID, actorId: 'author-1', actorRole: 'author' }),
    ).resolves.toHaveProperty('versions');
  });

  it('throws ContentNotFoundError if content is missing', async () => {
    const contents = new FakeContents();
    contents.entity = null;

    await expect(
      setup(contents).execute({
        contentId: ID,
        actorId: 'editor-1',
        actorRole: 'editor',
      }),
    ).rejects.toThrow(ContentNotFoundError);
  });

  it('throws ContentForbiddenError for another author draft', async () => {
    await expect(
      setup().execute({ contentId: ID, actorId: 'author-2', actorRole: 'author' }),
    ).rejects.toThrow(ContentForbiddenError);
  });
});
