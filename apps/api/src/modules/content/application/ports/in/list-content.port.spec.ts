import { describe, expect, it } from 'vitest';

import {
  ContentListItem,
  ListContentCommand,
  ListContentResult,
  ListContentUseCase,
} from './list-content.port';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';

describe('ListContentUseCase port', () => {
  it('defines command and paged result contracts', async () => {
    const item: ContentListItem = {
      id: 'content-1',
      title: 'Title',
      slug: 'title',
      status: ContentStatus.Draft,
      type: ContentType.Article,
      authorId: 'author-1',
      publishedAt: null,
      updatedAt: new Date('2026-05-14T00:00:00.000Z'),
    };
    const useCase: ListContentUseCase = {
      execute: async (_command: ListContentCommand): Promise<ListContentResult> => ({
        items: [item],
        total: 1,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      }),
    };

    await expect(
      useCase.execute({
        actorId: 'actor-1',
        actorRole: 'editor',
        page: 1,
        pageSize: 25,
      }),
    ).resolves.toEqual({
      items: [item],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });
  });
});
