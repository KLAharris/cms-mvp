import { describe, expect, it } from 'vitest';

import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import {
  UpdateContentCommand,
  UpdateContentResult,
  UpdateContentUseCase,
} from './update-content.port';

describe('UpdateContentUseCase port', () => {
  it('defines command and result contracts', async () => {
    const updatedAt = new Date('2026-05-14T00:00:00.000Z');
    const useCase: UpdateContentUseCase = {
      execute: async (_command: UpdateContentCommand): Promise<UpdateContentResult> => ({
        contentId: 'content-1',
        status: ContentStatus.Draft,
        updatedAt,
      }),
    };

    await expect(
      useCase.execute({
        contentId: 'content-1',
        actorId: 'actor-1',
        actorRole: 'author',
        title: 'New',
      }),
    ).resolves.toEqual({
      contentId: 'content-1',
      status: ContentStatus.Draft,
      updatedAt,
    });
  });
});
