import { describe, expect, it, vi } from 'vitest';
/* eslint-disable @typescript-eslint/unbound-method */

import { JobEnqueuer, MEDIA_VARIANT_QUEUE } from '../../../../../src/shared/ports/job-enqueuer.port';
import {
  MediaAlreadyFinalizedError,
  MediaForbiddenError,
  MediaItem,
  MediaNotFoundError,
} from '../../../../../src/modules/media/domain';
import { FinalizeMediaUseCase } from '../../../../../src/modules/media/application/use-cases';
import {
  MediaRepository,
  MimeValidator,
  ObjectStorage,
} from '../../../../../src/modules/media/application/ports/out';

const mediaId = '11111111-1111-4111-8111-111111111111';

function filenameFor(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'doc.pdf';
  if (mimeType === 'image/svg+xml') return 'image.svg';
  return 'hero.png';
}

function createMedia(mimeType = 'image/png', uploadedBy = 'user-1'): MediaItem {
  return MediaItem.create({
    id: mediaId,
    filename: filenameFor(mimeType),
    mimeType,
    sizeBytes: 100,
    maxSizeBytes: 1000,
    storageKey: 'media/original',
    uploadedBy,
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

function deps(repo: MediaRepository, jobs: JobEnqueuer) {
  const storage: ObjectStorage = {
    presignUpload: vi.fn<ObjectStorage['presignUpload']>(),
    getSignedUrl: vi.fn<ObjectStorage['getSignedUrl']>(),
    getObjectBytes: vi.fn<ObjectStorage['getObjectBytes']>().mockResolvedValue(Buffer.from('%PDF-1.7\n')),
    deleteObject: vi.fn<ObjectStorage['deleteObject']>(),
  };
  const mimeValidator: MimeValidator = {
    validateMimeConsistency: vi.fn<MimeValidator['validateMimeConsistency']>(),
  };

  return new FinalizeMediaUseCase(repo, jobs, storage, mimeValidator);
}

describe('FinalizeMediaUseCase', () => {
  it('marks PDF ready immediately and does not enqueue a job', async () => {
    const media = createMedia('application/pdf');
    const repo = repoWith(media);
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await deps(repo, jobs).execute({
      mediaId,
      requestedBy: 'user-1',
      requestedByRole: 'AUTHOR',
    });

    expect(media.status).toBe('ready');
    expect(jobs.enqueue).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(media);
  });

  it('enqueues image variant generation and keeps pending status', async () => {
    const media = createMedia();
    const repo = repoWith(media);
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await deps(repo, jobs).execute({
      mediaId,
      requestedBy: 'user-1',
      requestedByRole: 'AUTHOR',
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

    await deps(repo, jobs).execute({
      mediaId,
      requestedBy: 'user-1',
      requestedByRole: 'AUTHOR',
    });

    expect(media.status).toBe('pending');
    expect(jobs.enqueue).toHaveBeenCalledWith(MEDIA_VARIANT_QUEUE, {
      type: 'generate-variants',
      data: { mediaId },
    });
    expect(repo.save).toHaveBeenCalledWith(media);
  });

  it('allows AUTHOR to finalize their own upload', async () => {
    const media = createMedia('image/png', 'user-1');
    const repo = repoWith(media);
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await expect(
      deps(repo, jobs).execute({
        mediaId,
        requestedBy: 'user-1',
        requestedByRole: 'AUTHOR',
      }),
    ).resolves.toBeUndefined();
  });

  it('throws MediaForbiddenError when AUTHOR finalizes another user upload', async () => {
    const media = createMedia('image/png', 'user-1');
    const repo = repoWith(media);
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await expect(
      deps(repo, jobs).execute({
        mediaId,
        requestedBy: 'user-2',
        requestedByRole: 'AUTHOR',
      }),
    ).rejects.toThrow(MediaForbiddenError);
  });

  it('allows ADMIN to finalize any upload', async () => {
    const media = createMedia('image/png', 'user-1');
    const repo = repoWith(media);
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await expect(
      deps(repo, jobs).execute({
        mediaId,
        requestedBy: 'admin-1',
        requestedByRole: 'ADMIN',
      }),
    ).resolves.toBeUndefined();
  });

  it('throws MediaNotFoundError when findById returns null', async () => {
    const repo: MediaRepository = {
      save: vi.fn<MediaRepository['save']>(),
      findById: vi.fn<MediaRepository['findById']>().mockResolvedValue(null),
      findAll: vi.fn<MediaRepository['findAll']>(),
      delete: vi.fn<MediaRepository['delete']>(),
    };
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await expect(
      deps(repo, jobs).execute({
        mediaId,
        requestedBy: 'user-1',
        requestedByRole: 'AUTHOR',
      }),
    ).rejects.toThrow(MediaNotFoundError);
  });

  it('throws MediaAlreadyFinalizedError when media status is ready', async () => {
    const media = createMedia('application/pdf');
    media.markReady(new Map());
    const repo = repoWith(media);
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await expect(
      deps(repo, jobs).execute({
        mediaId,
        requestedBy: 'user-1',
        requestedByRole: 'AUTHOR',
      }),
    ).rejects.toThrow(MediaAlreadyFinalizedError);
  });

  it('throws MediaAlreadyFinalizedError when media status is failed', async () => {
    const media = createMedia();
    media.markFailed('processing error');
    const repo = repoWith(media);
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await expect(
      deps(repo, jobs).execute({
        mediaId,
        requestedBy: 'user-1',
        requestedByRole: 'AUTHOR',
      }),
    ).rejects.toThrow(MediaAlreadyFinalizedError);
  });

  it('allows EDITOR to finalize any upload', async () => {
    const media = createMedia('image/png', 'user-1');
    const repo = repoWith(media);
    const jobs: JobEnqueuer = { enqueue: vi.fn<JobEnqueuer['enqueue']>() };

    await expect(
      deps(repo, jobs).execute({
        mediaId,
        requestedBy: 'editor-1',
        requestedByRole: 'EDITOR',
      }),
    ).resolves.toBeUndefined();
  });
});
