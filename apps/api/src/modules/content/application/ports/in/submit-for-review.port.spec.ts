import { describe, expect, it } from 'vitest';

import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import {
  SubmitForReviewCommand,
  SubmitForReviewResult,
  SubmitForReviewUseCase,
} from './submit-for-review.port';

describe('SubmitForReviewUseCase port', () => {
  it('defines command and result contracts', async () => {
    const useCase: SubmitForReviewUseCase = {
      execute: async (
        _command: SubmitForReviewCommand,
      ): Promise<SubmitForReviewResult> => ({
        contentId: 'content-1',
        status: ContentStatus.InReview,
      }),
    };

    await expect(
      useCase.execute({
        contentId: 'content-1',
        actorId: 'actor-1',
        actorRole: 'author',
      }),
    ).resolves.toEqual({
      contentId: 'content-1',
      status: ContentStatus.InReview,
    });
  });
});
