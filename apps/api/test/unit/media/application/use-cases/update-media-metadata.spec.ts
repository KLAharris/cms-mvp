import { describe, expect, it, vi } from 'vitest';
/* eslint-disable @typescript-eslint/unbound-method */

import {
  MediaForbiddenError,
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

function createMedia(uploadedBy = 'user-1'): MediaItem {
  return MediaItem.create({
    id: mediaId,
    filename: 'hero.png',
    mimeType: 'image/png',
    sizeBytes: 100,
    maxSizeBytes: 1000,
    storageKey: 'media/hero.png',
    uploadedBy,
    uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('UpdateMediaMetadataUseCase', () => {
  it('throws when media is not found', async () => {
    await expect(
      new UpdateMediaMetadataUseCase(repository(null)).execute({
        mediaId,
        altText: 'Hero',
        requestedBy: 'user-1',
        requestedByRole: 'AUTHOR',
      }),
    ).rejects.toThrow(MediaNotFoundError);
  });

  it('updates metadata and returns dto', async () => {
    const media = createMedia();
    const repo = repository(media);

    const result = await new UpdateMediaMetadataUseCase(repo).execute({
      mediaId,
      altText: 'Hero',
      caption: 'Caption',
      requestedBy: 'user-1',
      requestedByRole: 'AUTHOR',
    });

    expect(result.altText).toBe('Hero');
    expect(result.caption).toBe('Caption');
    expect(repo.save).toHaveBeenCalledWith(media);
  });

  it('allows AUTHOR to update metadata for their own media', async () => {
    const media = createMedia('user-1');
    const repo = repository(media);

    await expect(
      new UpdateMediaMetadataUseCase(repo).execute({
        mediaId,
        altText: 'My image',
        requestedBy: 'user-1',
        requestedByRole: 'AUTHOR',
      }),
    ).resolves.toBeDefined();
  });

  it('throws MediaForbiddenError when AUTHOR updates another user media', async () => {
    const media = createMedia('user-1');
    const repo = repository(media);

    await expect(
      new UpdateMediaMetadataUseCase(repo).execute({
        mediaId,
        altText: 'Stolen',
        requestedBy: 'user-2',
        requestedByRole: 'AUTHOR',
      }),
    ).rejects.toThrow(MediaForbiddenError);
  });

  it('allows ADMIN to update metadata for any media', async () => {
    const media = createMedia('user-1');
    const repo = repository(media);

    await expect(
      new UpdateMediaMetadataUseCase(repo).execute({
        mediaId,
        altText: 'Admin override',
        requestedBy: 'admin-1',
        requestedByRole: 'ADMIN',
      }),
    ).resolves.toBeDefined();
  });

  it('allows EDITOR to update metadata for any media', async () => {
    const media = createMedia('user-1');
    const repo = repository(media);

    await expect(
      new UpdateMediaMetadataUseCase(repo).execute({
        mediaId,
        altText: 'Editor caption',
        requestedBy: 'editor-1',
        requestedByRole: 'EDITOR',
      }),
    ).resolves.toBeDefined();
  });
});
