import { describe, expect, it } from 'vitest';

import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';
import {
  CreateContentResult,
  CreateContentUseCase,
} from './create-content.port';

describe('CreateContentUseCase port', () => {
  it('defines command and result contracts', async () => {
    const useCase: CreateContentUseCase = {
      execute: (): Promise<CreateContentResult> => Promise.resolve({
        contentId: 'content-1',
        slug: 'title',
        status: ContentStatus.Draft,
      }),
    };

    await expect(
      useCase.execute({
        type: ContentType.Article,
        title: 'Title',
        actorId: 'author-1',
        actorRole: 'author',
      }),
    ).resolves.toEqual({
      contentId: 'content-1',
      slug: 'title',
      status: ContentStatus.Draft,
    });
  });
});
