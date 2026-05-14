import { describe, expect, it } from 'vitest';

import { Content } from '../../domain/entities/content.entity';
import { ContentVersion } from '../../domain/entities/content-version.entity';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';
import { ContentType } from '../../domain/value-objects/content-type.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { ContentRepository } from '../ports/out/content-repository.port';
import { ContentVersionRepository } from '../ports/out/content-version-repository.port';
import { CreateContentUseCase } from './create-content.use-case';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const IDS = [
  '123e4567-e89b-42d3-a456-426614174000',
  '223e4567-e89b-42d3-a456-426614174000',
  '323e4567-e89b-42d3-a456-426614174000',
];

class FakeContents implements ContentRepository {
  saved: Content[] = [];
  existingSlugs = new Set<string>();

  async save(content: Content): Promise<void> {
    this.saved.push(content);
  }

  async findById(_id: ContentId): Promise<Content | null> {
    return null;
  }

  async findBySlug(_type: ContentType, slug: Slug): Promise<Content | null> {
    return this.existingSlugs.has(slug.value)
      ? Content.create({
          id: ContentId.create('323e4567-e89b-42d3-a456-426614174000'),
          type: ContentType.Article,
          title: 'Existing',
          slug,
          authorId: 'other-author',
          seoMetadata: SeoMetadata.create('', ''),
          createdAt: NOW,
        })
      : null;
  }

  async findMany(): Promise<never> {
    throw new Error('not used');
  }

  async delete(_id: ContentId): Promise<void> {
    throw new Error('not used');
  }
}

class FakeVersions implements ContentVersionRepository {
  saved: ContentVersion[] = [];

  async save(version: ContentVersion): Promise<void> {
    this.saved.push(version);
  }

  async findByContentId(): Promise<ContentVersion[]> {
    return [];
  }

  async findByVersionNo(): Promise<ContentVersion | null> {
    return null;
  }

  async nextVersionNo(): Promise<number> {
    return 1;
  }
}

function useCase(contents = new FakeContents(), versions = new FakeVersions()) {
  let index = 0;
  return {
    contents,
    versions,
    useCase: new CreateContentUseCase(
      contents,
      versions,
      { generate: () => IDS[index++] ?? IDS[0]! },
      { now: () => NOW },
      { run: async (fn) => fn() },
    ),
  };
}

describe('CreateContentUseCase', () => {
  it('creates draft content and first version', async () => {
    const setup = useCase();

    const result = await setup.useCase.execute({
      type: ContentType.Article,
      title: 'My First Article',
      actorId: 'author-1',
      actorRole: 'author',
      tags: ['Tech'],
      category: 'News',
    });

    expect(result).toEqual({
      contentId: IDS[0],
      slug: 'my-first-article',
      status: ContentStatus.Draft,
    });
    expect(setup.contents.saved).toHaveLength(1);
    expect(setup.contents.saved[0]?.tags[0]?.value).toBe('tech');
    expect(setup.contents.saved[0]?.category).toBe('News');
    expect(setup.versions.saved[0]?.versionNo).toBe(1);
    expect(setup.versions.saved[0]?.editorId).toBe('author-1');
  });

  it('stores parentId when provided', async () => {
    const setup = useCase();

    await setup.useCase.execute({
      type: ContentType.Page,
      title: 'Child Page',
      actorId: 'author-1',
      actorRole: 'author',
      parentId: 'parent-1',
    });

    expect(setup.contents.saved[0]?.parentId).toBe('parent-1');
  });

  it('appends -2 and -3 when generated slugs already exist', async () => {
    const contents = new FakeContents();
    contents.existingSlugs.add('my-title');
    const setupTwo = useCase(contents);

    await expect(
      setupTwo.useCase.execute({
        type: ContentType.Article,
        title: 'My Title',
        actorId: 'editor-1',
        actorRole: 'editor',
      }),
    ).resolves.toMatchObject({ slug: 'my-title-2' });

    contents.existingSlugs.add('my-title-2');
    const setupThree = useCase(contents, new FakeVersions());
    await expect(
      setupThree.useCase.execute({
        type: ContentType.Article,
        title: 'My Title',
        actorId: 'admin-1',
        actorRole: 'admin',
      }),
    ).resolves.toMatchObject({ slug: 'my-title-3' });
  });

  it.each(['author', 'editor', 'admin'])('allows %s to create', async (actorRole) => {
    const setup = useCase();

    await expect(
      setup.useCase.execute({
        type: ContentType.Page,
        title: 'Page Title',
        actorId: `${actorRole}-1`,
        actorRole,
        parentId: null,
      }),
    ).resolves.toMatchObject({ status: ContentStatus.Draft });
  });
});
