import { describe, expect, it } from 'vitest';

import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';
import {
  CreateContentCommand,
  CreateContentResult,
  CreateContentUseCase,
} from './create-content.port';

describe('CreateContentUseCase port', () => {
  it('defines command and result contracts', async () => {
    const useCase: CreateContentUseCase = {
      execute: async (_command: CreateContentCommand): Promise<CreateContentResult> => ({
        contentId: 'content-1',
        status: ContentStatus.Draft,
      }),
    };

    await expect(
      useCase.execute({
        type: ContentType.Article,
        title: 'Title',
        authorId: 'author-1',
      }),
    ).resolves.toEqual({ contentId: 'content-1', status: ContentStatus.Draft });
  });
});
