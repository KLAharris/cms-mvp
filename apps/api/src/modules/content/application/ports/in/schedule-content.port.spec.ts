import { describe, expect, it } from 'vitest';

import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import {
  ScheduleContentCommand,
  ScheduleContentResult,
  ScheduleContentUseCase,
} from './schedule-content.port';

describe('ScheduleContentUseCase port', () => {
  it('defines command and result contracts', async () => {
    const scheduledAt = new Date('2026-05-15T00:00:00.000Z');
    const useCase: ScheduleContentUseCase = {
      execute: async (
        _command: ScheduleContentCommand,
      ): Promise<ScheduleContentResult> => ({
        contentId: 'content-1',
        status: ContentStatus.Draft,
        scheduledAt,
      }),
    };

    await expect(
      useCase.execute({
        contentId: 'content-1',
        actorId: 'actor-1',
        actorRole: 'editor',
        scheduledAt,
      }),
    ).resolves.toEqual({
      contentId: 'content-1',
      status: ContentStatus.Draft,
      scheduledAt,
    });
  });
});
