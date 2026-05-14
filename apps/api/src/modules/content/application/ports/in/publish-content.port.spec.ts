import { describe, expect, it } from 'vitest';

import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import {
  PublishContentCommand,
  PublishContentResult,
  PublishContentUseCase,
} from './publish-content.port';

describe('PublishContentUseCase port', () => {
  it('defines command and result contracts', async () => {
    const publishedAt = new Date('2026-05-14T00:00:00.000Z');
    const useCase: PublishContentUseCase = {
      execute: async (
        _command: PublishContentCommand,
      ): Promise<PublishContentResult> => ({
        contentId: 'content-1',
        status: ContentStatus.Published,
        publishedAt,
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
      status: ContentStatus.Published,
      publishedAt,
    });
  });
});
