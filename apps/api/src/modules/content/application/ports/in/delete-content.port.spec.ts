import { describe, expect, it } from 'vitest';

import {
  DeleteContentCommand,
  DeleteContentResult,
  DeleteContentUseCase,
} from './delete-content.port';

describe('DeleteContentUseCase port', () => {
  it('defines command and result contracts', async () => {
    const deletedAt = new Date('2026-05-14T00:00:00.000Z');
    const useCase: DeleteContentUseCase = {
      execute: async (_command: DeleteContentCommand): Promise<DeleteContentResult> => ({
        contentId: 'content-1',
        deletedAt,
      }),
    };

    await expect(
      useCase.execute({
        contentId: 'content-1',
        actorId: 'actor-1',
        actorRole: 'editor',
      }),
    ).resolves.toEqual({ contentId: 'content-1', deletedAt });
  });
});
