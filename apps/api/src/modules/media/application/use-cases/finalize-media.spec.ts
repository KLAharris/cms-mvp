import { describe, expect, it, vi } from 'vitest';

import { JobEnqueuer } from '../../../../shared/ports/job-enqueuer.port';
import { MediaItem } from '../../domain/entities';
import { UnsupportedMediaTypeError } from '../../domain/errors';
import { MediaId } from '../../domain/value-objects';
import { MediaRepository, MimeValidator, ObjectStorage } from '../ports/out';
import { FinalizeMediaUseCase } from './finalize-media';

const MEDIA_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'user-1';

describe('FinalizeMediaUseCase', () => {
  it('validates uploaded bytes before enqueueing variant generation', async () => {
    const state = setup();

    await state.useCase.execute({
      mediaId: MEDIA_ID,
      requestedBy: USER_ID,
      requestedByRole: 'EDITOR',
    });

    expect(state.storage.getObjectBytes).toHaveBeenCalledWith(
      'media/11111111-1111-4111-8111-111111111111/photo.png',
    );
    expect(state.mimeValidator.validateMimeConsistency).toHaveBeenCalledWith({
      filename: 'photo.png',
      declaredMimeType: 'image/png',
      bytes: state.bytes,
    });
    expect(state.jobs.enqueue).toHaveBeenCalledTimes(1);
    expect(state.media.saved).toHaveLength(1);
  });

  it('rejects a magic byte mismatch and leaves media pending', async () => {
    const state = setup({
      mimeValidatorError: new UnsupportedMediaTypeError(
        'image/png',
        'Uploaded file magic bytes indicate image/jpeg, not image/png',
      ),
    });

    await expect(
      state.useCase.execute({
        mediaId: MEDIA_ID,
        requestedBy: USER_ID,
        requestedByRole: 'EDITOR',
      }),
    ).rejects.toThrow(UnsupportedMediaTypeError);

    expect(state.jobs.enqueue).not.toHaveBeenCalled();
    expect(state.media.saved).toHaveLength(0);
    expect(state.media.item?.status).toBe('pending');
  });
});

function setup(options: { mimeValidatorError?: Error } = {}) {
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const media = new FakeMediaRepository(
    MediaItem.create({
      id: MEDIA_ID,
      filename: 'photo.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      maxSizeBytes: 20 * 1024 * 1024,
      storageKey: 'media/11111111-1111-4111-8111-111111111111/photo.png',
      uploadedBy: USER_ID,
    }),
  );
  const jobs = {
    enqueue: vi.fn<JobEnqueuer['enqueue']>().mockResolvedValue(undefined),
  };
  const storage = {
    presignUpload: vi.fn<ObjectStorage['presignUpload']>(),
    getSignedUrl: vi.fn<ObjectStorage['getSignedUrl']>(),
    getObjectBytes: vi.fn<ObjectStorage['getObjectBytes']>().mockResolvedValue(bytes),
    deleteObject: vi.fn<ObjectStorage['deleteObject']>(),
  };
  const mimeValidator = {
    validateMimeConsistency: vi.fn<MimeValidator['validateMimeConsistency']>(() => {
      if (options.mimeValidatorError !== undefined) {
        throw options.mimeValidatorError;
      }
    }),
  };

  return {
    bytes,
    jobs,
    media,
    mimeValidator,
    storage,
    useCase: new FinalizeMediaUseCase(media, jobs, storage, mimeValidator),
  };
}

class FakeMediaRepository implements MediaRepository {
  readonly saved: MediaItem[] = [];

  constructor(readonly item: MediaItem | null) {}

  save(media: MediaItem): Promise<void> {
    this.saved.push(media);
    return Promise.resolve();
  }

  findById(id: MediaId): Promise<MediaItem | null> {
    if (this.item === null || this.item.id.value !== id.value) {
      return Promise.resolve(null);
    }

    return Promise.resolve(this.item);
  }

  findAll(): Promise<never> {
    return Promise.reject(new Error('Not implemented'));
  }

  delete(): Promise<never> {
    return Promise.reject(new Error('Not implemented'));
  }
}
