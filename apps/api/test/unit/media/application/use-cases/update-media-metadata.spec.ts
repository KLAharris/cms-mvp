import { describe, expect, it, vi } from 'vitest';
/* eslint-disable @typescript-eslint/unbound-method */

import {
  MediaItem,
  MediaNotFoundError,
} from '../../../../../src/modules/media/domain';
import { UpdateMediaMetadataUseCase } from '../../../../../src/modules/media/application/use-cases';
import { MediaRepository } from '../../../../../src/modules/media/application/ports/out';

const mediaId = '11111111-1111-4111-8111-111111111111';

function repository(media: MediaItem | null): MediaRepository {
  return {
    save: vi.fn<MediaRepository['save']>(),
    findById: vi.fn<MediaRepository['findById']>().mockResolvedValue(media),
    findAll: vi.fn<MediaRepository['findAll']>(),
    delete: vi.fn<MediaRepository['delete']>(),
  };
}

describe('UpdateMediaMetadataUseCase', () => {
  it('throws when media is not found', async () => {
    await expect(
      new UpdateMediaMetadataUseCase(repository(null)).execute({
        mediaId,
        altText: 'Hero',
        requestedBy: 'user-1',
      }),
    ).rejects.toThrow(MediaNotFoundError);
  });

  it('updates metadata and returns dto', async () => {
    const media = MediaItem.create({
      id: mediaId,
      filename: 'hero.png',
      mimeType: 'image/png',
      sizeBytes: 100,
      maxSizeBytes: 1000,
      storageKey: 'media/hero.png',
      uploadedBy: 'user-1',
      uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const repo = repository(media);

    const result = await new UpdateMediaMetadataUseCase(repo).execute({
      mediaId,
      altText: 'Hero',
      caption: 'Caption',
      requestedBy: 'user-1',
    });

    expect(result.altText).toBe('Hero');
    expect(result.caption).toBe('Caption');
    expect(repo.save).toHaveBeenCalledWith(media);
  });
});
