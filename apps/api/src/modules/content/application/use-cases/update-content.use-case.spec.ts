import { describe, expect, it } from 'vitest';

import { FakeAuditRepository } from '../../../audit/tests/doubles/fake-audit.repository';
import { Content } from '../../domain/entities/content.entity';
import { ContentVersion } from '../../domain/entities/content-version.entity';
import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { SlugConflictError } from '../../domain/errors/slug-conflict.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { ContentType } from '../../domain/value-objects/content-type.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { ContentRepository, PagedResult } from '../ports/out/content-repository.port';
import { ContentVersionRepository } from '../ports/out/content-version-repository.port';
import { UpdateContentUseCase } from './update-content.use-case';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const ID = '123e4567-e89b-42d3-a456-426614174000';
const OTHER_ID = '223e4567-e89b-42d3-a456-426614174000';

function content(id = ID, authorId = 'author-1'): Content {
  return Content.create({
    id: ContentId.create(id),
    type: ContentType.Article,
    title: 'Title',
    slug: Slug.create('title'),
    authorId,
    seoMetadata: SeoMetadata.create('', ''),
    createdAt: NOW,
  });
}

class FakeContents implements ContentRepository {
  saved: Content[] = [];
  entity: Content | null = content();
  slugResult: Content | null = null;

  save(contentEntity: Content): Promise<void> {
    this.saved.push(contentEntity);
    return Promise.resolve();
  }

  findById(): Promise<Content | null> {
    return Promise.resolve(this.entity);
  }

  findBySlug(): Promise<Content | null> {
    return Promise.resolve(this.slugResult);
  }

  findMany(): Promise<PagedResult<Content>> {
    throw new Error('not used');
  }

  delete(): Promise<void> {
    throw new Error('not used');
  }
}

class FakeVersions implements ContentVersionRepository {
  saved: ContentVersion[] = [];

  save(version: ContentVersion): Promise<void> {
    this.saved.push(version);
    return Promise.resolve();
  }

  findByContentId(): Promise<ContentVersion[]> {
    return Promise.resolve([]);
  }

  findByVersionNo(): Promise<ContentVersion | null> {
    return Promise.resolve(null);
  }

  nextVersionNo(): Promise<number> {
    return Promise.resolve(2);
  }
}

function setup(contents = new FakeContents()) {
  const versions = new FakeVersions();
  const audit = new FakeAuditRepository();
  return {
    audit,
    contents,
    versions,
    useCase: new UpdateContentUseCase(
      contents,
      versions,
      { generate: () => OTHER_ID },
      { now: () => NOW },
      { run: (fn) => fn() },
      audit,
    ),
  };
}

describe('UpdateContentUseCase', () => {
  it('updates title, sets updatedAt, and creates a new version', async () => {
    const state = setup();

    const result = await state.useCase.execute({
      contentId: ID,
      actorId: 'author-1',
      actorRole: 'author',
      title: 'Updated',
      body: { type: 'doc' },
      seoMetadata: { title: 'SEO', description: 'Description' },
      tags: ['Tech'],
      featuredImageId: 'image-1',
      socialImageId: 'image-2',
    });

    expect(result.updatedAt).toBe(NOW);
    expect(state.contents.saved[0]?.title).toBe('Updated');
    expect(state.versions.saved[0]?.versionNo).toBe(2);
    expect(state.audit.events).toHaveLength(1);
  });

  it('throws ContentNotFoundError if content is missing', async () => {
    const contents = new FakeContents();
    contents.entity = null;

    await expect(
      setup(contents).useCase.execute({
        contentId: ID,
        actorId: 'author-1',
        actorRole: 'author',
      }),
    ).rejects.toThrow(ContentNotFoundError);
  });

  it('throws ContentForbiddenError if author edits another author content', async () => {
    await expect(
      setup().useCase.execute({
        contentId: ID,
        actorId: 'author-2',
        actorRole: 'author',
        title: 'Updated',
      }),
    ).rejects.toThrow(ContentForbiddenError);
  });

  it('throws SlugConflictError for a different content item', async () => {
    const contents = new FakeContents();
    contents.slugResult = content(OTHER_ID, 'author-2');

    await expect(
      setup(contents).useCase.execute({
        contentId: ID,
        actorId: 'editor-1',
        actorRole: 'editor',
        slug: 'other-title',
      }),
    ).rejects.toThrow(SlugConflictError);
  });

  it('allows updating to the same slug', async () => {
    const contents = new FakeContents();
    contents.slugResult = contents.entity;

    await expect(
      setup(contents).useCase.execute({
        contentId: ID,
        actorId: 'author-1',
        actorRole: 'author',
        slug: 'title',
      }),
    ).resolves.toMatchObject({ contentId: ID });
  });
});
