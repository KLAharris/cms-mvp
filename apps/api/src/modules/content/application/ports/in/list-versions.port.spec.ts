import { describe, expect, it } from 'vitest';

import {
  ListVersionsResult,
  ListVersionsUseCase,
} from './list-versions.port';

describe('ListVersionsUseCase port', () => {
  it('defines command and result contracts', async () => {
    const createdAt = new Date('2026-06-01T00:00:00.000Z');
    const useCase: ListVersionsUseCase = {
      execute: (): Promise<ListVersionsResult> => Promise.resolve({
        versions: [{ versionNo: 1, editorId: 'editor-1', createdAt }],
      }),
    };

    await expect(
      useCase.execute({
        contentId: 'content-1',
        actorId: 'actor-1',
        actorRole: 'editor',
      }),
    ).resolves.toEqual({
      versions: [{ versionNo: 1, editorId: 'editor-1', createdAt }],
    });
  });
});
