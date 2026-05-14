import { describe, expect, it } from 'vitest';

import {
  GetContentCommand,
  GetContentResult,
  GetContentUseCase,
} from './get-content.port';

describe('GetContentUseCase port', () => {
  it('defines command and result contracts', async () => {
    const result: GetContentResult = {
      contentId: 'content-1',
      title: 'Title',
      slug: 'title',
      status: 'draft',
      type: 'article',
      body: null,
      updatedAt: new Date('2026-05-14T00:00:00.000Z'),
    };
    const useCase: GetContentUseCase = {
      execute: async (_command: GetContentCommand): Promise<GetContentResult> =>
        result,
    };

    await expect(useCase.execute({ contentId: 'content-1' })).resolves.toBe(
      result,
    );
  });
});
