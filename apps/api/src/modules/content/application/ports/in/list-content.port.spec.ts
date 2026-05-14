import { describe, expect, it } from 'vitest';

import {
  ContentListItem,
  ListContentCommand,
  ListContentResult,
  ListContentUseCase,
} from './list-content.port';

describe('ListContentUseCase port', () => {
  it('defines command and paged result contracts', async () => {
    const item: ContentListItem = {
      contentId: 'content-1',
      title: 'Title',
      slug: 'title',
      status: 'draft',
      type: 'article',
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

    await expect(useCase.execute({ page: 1, pageSize: 25 })).resolves.toEqual({
      items: [item],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });
  });
});
