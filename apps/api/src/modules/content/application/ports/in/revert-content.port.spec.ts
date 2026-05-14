import { describe, expect, it } from 'vitest';

import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import {
  RevertContentResult,
  RevertContentUseCase,
} from './revert-content.port';

describe('RevertContentUseCase port', () => {
  it('defines command and result contracts', async () => {
    const useCase: RevertContentUseCase = {
      execute: (): Promise<RevertContentResult> => Promise.resolve({
        contentId: 'content-1',
        status: ContentStatus.Draft,
        newVersionNo: 2,
      }),
    };

    await expect(
      useCase.execute({
        contentId: 'content-1',
        versionNo: 2,
        actorId: 'actor-1',
        actorRole: 'author',
      }),
    ).resolves.toEqual({
      contentId: 'content-1',
      status: ContentStatus.Draft,
      newVersionNo: 2,
    });
  });
});
