import { describe, expect, it, vi } from 'vitest';
/* eslint-disable @typescript-eslint/unbound-method */

import { Clock } from '../../../../../src/shared/ports/clock.port';
import { IdGenerator } from '../../../../../src/shared/ports/id-generator.port';
import {
  FileSizeLimitExceededError,
  MediaItem,
  UnsupportedMediaTypeError,
} from '../../../../../src/modules/media/domain';
import { PresignUploadUseCase } from '../../../../../src/modules/media/application/use-cases';
import {
  MediaRepository,
  ObjectStorage,
} from '../../../../../src/modules/media/application/ports/out';

const mediaId = '11111111-1111-4111-8111-111111111111';

function repository(): MediaRepository {
  return {
    save: vi.fn<MediaRepository['save']>(),
    findById: vi.fn<MediaRepository['findById']>(),
    findAll: vi.fn<MediaRepository['findAll']>(),
    delete: vi.fn<MediaRepository['delete']>(),
    countReferences: vi.fn<MediaRepository['countReferences']>(),
  };
}

function storage(): ObjectStorage {
  return {
    presignUpload: vi.fn<ObjectStorage['presignUpload']>().mockResolvedValue({
      uploadUrl: 'https://upload.test',
      storageKey: 'media/generated/hero.png',
      expiresAt: new Date('2026-01-01T00:05:00.000Z'),
    }),
    getSignedUrl: vi.fn<ObjectStorage['getSignedUrl']>(),
    deleteObject: vi.fn<ObjectStorage['deleteObject']>(),
  };
}

describe('PresignUploadUseCase', () => {
  it('returns a presigned upload URL and saves pending media', async () => {
    const media = repository();
    const objectStorage = storage();
    const ids: IdGenerator = { generate: vi.fn<IdGenerator['generate']>().mockReturnValue(mediaId) };
    const clock: Clock = {
      now: vi.fn<Clock['now']>().mockReturnValue(new Date('2026-01-01T00:00:00.000Z')),
    };
    const useCase = new PresignUploadUseCase(media, objectStorage, ids, clock, 1000);

    const result = await useCase.execute({
      filename: 'hero.png',
      mimeType: 'image/png',
      sizeBytes: 100,
      uploadedBy: 'user-1',
    });

    expect(result.uploadUrl).toBe('https://upload.test');
    expect(result.mediaId).toBe(mediaId);
    expect(objectStorage.presignUpload).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'image/png', maxBytes: 1000, ttlSeconds: 300 }),
    );
    expect(media.save).toHaveBeenCalledWith(expect.any(MediaItem));
  });

  it('rejects invalid mime types', async () => {
    const useCase = new PresignUploadUseCase(
      repository(),
      storage(),
      { generate: vi.fn<IdGenerator['generate']>().mockReturnValue(mediaId) },
      { now: vi.fn<Clock['now']>().mockReturnValue(new Date()) },
      1000,
    );

    await expect(
      useCase.execute({
        filename: 'note.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
        uploadedBy: 'user-1',
      }),
    ).rejects.toThrow(UnsupportedMediaTypeError);
  });

  it('rejects oversized uploads', async () => {
    const useCase = new PresignUploadUseCase(
      repository(),
      storage(),
      { generate: vi.fn<IdGenerator['generate']>().mockReturnValue(mediaId) },
      { now: vi.fn<Clock['now']>().mockReturnValue(new Date()) },
      1000,
    );

    await expect(
      useCase.execute({
        filename: 'hero.png',
        mimeType: 'image/png',
        sizeBytes: 1001,
        uploadedBy: 'user-1',
      }),
    ).rejects.toThrow(FileSizeLimitExceededError);
  });
});
