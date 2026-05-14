import { describe, expect, it } from 'vitest';

import {
  GetContentResult,
  GetContentUseCase,
} from './get-content.port';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';

describe('GetContentUseCase port', () => {
  it('defines command and result contracts', async () => {
    const result: GetContentResult = {
      contentId: 'content-1',
      type: ContentType.Article,
      title: 'Title',
      slug: 'title',
      status: ContentStatus.Draft,
      authorId: 'author-1',
      body: null,
      featuredImageId: null,
      socialImageId: null,
      seoMetadata: { title: '', description: '' },
      tags: [],
      category: null,
      parentId: null,
      scheduledAt: null,
      publishedAt: null,
      deletedAt: null,
      createdAt: new Date('2026-05-14T00:00:00.000Z'),
      updatedAt: new Date('2026-05-14T00:00:00.000Z'),
    };
    const useCase: GetContentUseCase = {
      execute: (): Promise<GetContentResult> => Promise.resolve(result),
    };

    await expect(
      useCase.execute({
        contentId: 'content-1',
        actorId: 'actor-1',
        actorRole: 'editor',
      }),
    ).resolves.toBe(result);
  });
});
