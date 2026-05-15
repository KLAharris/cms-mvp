import { describe, expect, it, vi } from 'vitest';
/* eslint-disable @typescript-eslint/unbound-method */

import { JobEnqueuer, MEDIA_VARIANT_QUEUE } from '../../../../../src/shared/ports/job-enqueuer.port';
import { MediaItem } from '../../../../../src/modules/media/domain';
import { FinalizeMediaUseCase } from '../../../../../src/modules/media/application/use-cases';
import { MediaRepository } from '../../../../../src/modules/media/application/ports/out';

const mediaId = '11111111-1111-4111-8111-111111111111';

function filenameFor(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'doc.pdf';
  if (mimeType === 'image/svg+xml') return 'image.svg';
  return 'hero.png';
}

function createMedia(mimeType = 'image/png'): MediaItem {
  return MediaItem.create({
    id: mediaId,
    filename: filenameFor(mimeType),
    mimeType,
    sizeBytes: 100,
    maxSizeBytes: 1000,
    storageKey: 'media/original',
    uploadedBy: 'user-1',
    uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function repoWith(media: MediaItem): MediaRepository {
  return {
    save: vi.fn<MediaRepository['save']>(),
    findById: vi.fn<MediaRepository['findById']>().mockResolvedValue(media),
    findAll: vi.fn<MediaRepository['findAll']>(),
    delete: vi.fn<MediaRepository['delete']>(),
  };
}

describe('FinalizeMediaUseCase', () => {
  it('marks PDF ready immediately and does not enqueue a job', async () => {
    const media = createMedia('application/pdf');
    const repo = repoWith(media);
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await new FinalizeMediaUseCase(repo, jobs).execute({
      mediaId,
      requestedBy: 'user-1',
    });

    expect(media.status).toBe('ready');
    expect(jobs.enqueue).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(media);
  });

  it('enqueues image variant generation and keeps pending status', async () => {
    const media = createMedia();
    const repo = repoWith(media);
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await new FinalizeMediaUseCase(repo, jobs).execute({
      mediaId,
      requestedBy: 'user-1',
    });

    expect(media.status).toBe('pending');
    expect(jobs.enqueue).toHaveBeenCalledWith(MEDIA_VARIANT_QUEUE, {
      type: 'generate-variants',
      data: { mediaId },
    });
    expect(repo.save).toHaveBeenCalledWith(media);
  });

  it('enqueues SVG sanitization job and does not mark ready immediately', async () => {
    const media = createMedia('image/svg+xml');
    const repo = repoWith(media);
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await new FinalizeMediaUseCase(repo, jobs).execute({
      mediaId,
      requestedBy: 'user-1',
    });

    expect(media.status).toBe('pending');
    expect(jobs.enqueue).toHaveBeenCalledWith(MEDIA_VARIANT_QUEUE, {
      type: 'generate-variants',
      data: { mediaId },
    });
    expect(repo.save).toHaveBeenCalledWith(media);
  });
});
