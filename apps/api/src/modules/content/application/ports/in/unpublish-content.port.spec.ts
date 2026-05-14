import { describe, expect, it } from 'vitest';

import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import {
  UnpublishContentCommand,
  UnpublishContentResult,
  UnpublishContentUseCase,
} from './unpublish-content.port';

describe('UnpublishContentUseCase port', () => {
  it('defines command and result contracts', async () => {
    const useCase: UnpublishContentUseCase = {
      execute: async (
        _command: UnpublishContentCommand,
      ): Promise<UnpublishContentResult> => ({
        contentId: 'content-1',
        status: ContentStatus.Unpublished,
      }),
    };

    await expect(
      useCase.execute({
        contentId: 'content-1',
        actorId: 'actor-1',
        actorRole: 'editor',
      }),
    ).resolves.toEqual({
      contentId: 'content-1',
      status: ContentStatus.Unpublished,
    });
  });
});
