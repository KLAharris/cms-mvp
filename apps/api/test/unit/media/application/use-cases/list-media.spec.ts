import { describe, expect, it, vi } from 'vitest';
/* eslint-disable @typescript-eslint/unbound-method */

import { PagedResult } from '../../../../../src/shared/kernel/paged-result';
import { MediaItem } from '../../../../../src/modules/media/domain';
import { ListMediaUseCase } from '../../../../../src/modules/media/application/use-cases';
import { MediaRepository } from '../../../../../src/modules/media/application/ports/out';

const mediaId = '11111111-1111-4111-8111-111111111111';

describe('ListMediaUseCase', () => {
  it('delegates mapped query and returns paged dto result', async () => {
    const uploadedAt = new Date('2026-01-01T00:00:00.000Z');
    const media = MediaItem.create({
      id: mediaId,
      filename: 'hero.png',
      mimeType: 'image/png',
      sizeBytes: 100,
      maxSizeBytes: 1000,
      storageKey: 'media/hero.png',
      uploadedBy: 'user-1',
      uploadedAt,
    });
    const paged: PagedResult<MediaItem> = {
      items: [media],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };
    const repo: MediaRepository = {
      save: vi.fn<MediaRepository['save']>(),
      findById: vi.fn<MediaRepository['findById']>(),
      findAll: vi.fn<MediaRepository['findAll']>().mockResolvedValue(paged),
      delete: vi.fn<MediaRepository['delete']>(),
      countReferences: vi.fn<MediaRepository['countReferences']>(),
    };

    const result = await new ListMediaUseCase(repo).execute({
      search: 'hero',
      uploadedBy: 'user-1',
      requestedBy: 'admin-1',
    });

    expect(repo.findAll).toHaveBeenCalledWith({
      search: 'hero',
      uploadedBy: 'user-1',
      dateFrom: undefined,
      dateTo: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(result.items[0]).toMatchObject({
      id: mediaId,
      filename: 'hero.png',
      requiresSanitization: false,
    });
  });
});
