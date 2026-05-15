import { describe, expect, it, vi } from 'vitest';
/* eslint-disable @typescript-eslint/unbound-method */

import { PagedResult } from '../../../../../src/shared/kernel/paged-result';
import { MediaItem } from '../../../../../src/modules/media/domain';
import { ListMediaUseCase } from '../../../../../src/modules/media/application/use-cases';
import { MediaRepository } from '../../../../../src/modules/media/application/ports/out';

const mediaId = '11111111-1111-4111-8111-111111111111';

function emptyPaged(): PagedResult<MediaItem> {
  return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
}

function repoReturning(paged: PagedResult<MediaItem>): MediaRepository {
  return {
    save: vi.fn<MediaRepository['save']>(),
    findById: vi.fn<MediaRepository['findById']>(),
    findAll: vi.fn<MediaRepository['findAll']>().mockResolvedValue(paged),
    delete: vi.fn<MediaRepository['delete']>(),
  };
}

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
    const repo = repoReturning(paged);

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

  it('returns PagedResult with empty items when repository returns no results', async () => {
    const repo = repoReturning(emptyPaged());

    const result = await new ListMediaUseCase(repo).execute({ requestedBy: 'user-1' });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('defaults page to 1 when not provided', async () => {
    const repo = repoReturning(emptyPaged());

    await new ListMediaUseCase(repo).execute({ requestedBy: 'user-1' });

    expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('defaults pageSize to 20 when not provided', async () => {
    const repo = repoReturning(emptyPaged());

    await new ListMediaUseCase(repo).execute({ requestedBy: 'user-1' });

    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 20 }),
    );
  });

  it('passes search filter through to the repository query', async () => {
    const repo = repoReturning(emptyPaged());

    await new ListMediaUseCase(repo).execute({ requestedBy: 'user-1', search: 'cat' });

    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'cat' }),
    );
  });

  it('passes uploadedBy filter through to the repository query', async () => {
    const repo = repoReturning(emptyPaged());

    await new ListMediaUseCase(repo).execute({
      requestedBy: 'admin-1',
      uploadedBy: 'user-42',
    });

    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ uploadedBy: 'user-42' }),
    );
  });

  it('passes dateFrom and dateTo filters through to the repository query', async () => {
    const repo = repoReturning(emptyPaged());
    const dateFrom = new Date('2026-01-01');
    const dateTo = new Date('2026-06-30');

    await new ListMediaUseCase(repo).execute({
      requestedBy: 'admin-1',
      dateFrom,
      dateTo,
    });

    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom, dateTo }),
    );
  });
});
