import { describe, expect, it } from 'vitest';

import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import {
  RevertContentCommand,
  RevertContentResult,
  RevertContentUseCase,
} from './revert-content.port';

describe('RevertContentUseCase port', () => {
  it('defines command and result contracts', async () => {
    const useCase: RevertContentUseCase = {
      execute: async (_command: RevertContentCommand): Promise<RevertContentResult> => ({
        contentId: 'content-1',
        status: ContentStatus.Draft,
        versionNo: 2,
      }),
    };

    await expect(
      useCase.execute({ contentId: 'content-1', versionNo: 2, actorId: 'actor-1' }),
    ).resolves.toEqual({
      contentId: 'content-1',
      status: ContentStatus.Draft,
      versionNo: 2,
    });
  });
});
