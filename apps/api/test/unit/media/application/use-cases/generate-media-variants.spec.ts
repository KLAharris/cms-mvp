import { describe, expect, it, vi } from 'vitest';
/* eslint-disable @typescript-eslint/unbound-method */

import { DomainEventPublisher } from '../../../../../src/shared/ports/event-publisher.port';
import {
  MediaItem,
  MediaVariant,
  StorageKey,
} from '../../../../../src/modules/media/domain';
import { GenerateMediaVariantsUseCase } from '../../../../../src/modules/media/application/use-cases';
import {
  ImageProcessor,
  MediaRepository,
} from '../../../../../src/modules/media/application/ports/out';

const mediaId = '11111111-1111-4111-8111-111111111111';

function mediaItem(): MediaItem {
  return MediaItem.create({
    id: mediaId,
    filename: 'hero.png',
    mimeType: 'image/png',
    sizeBytes: 100,
    maxSizeBytes: 1000,
    storageKey: 'media/original.png',
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
    countReferences: vi.fn<MediaRepository['countReferences']>(),
  };
}

describe('GenerateMediaVariantsUseCase', () => {
  it('marks media ready and publishes upload event on success', async () => {
    const media = mediaItem();
    const repo = repoWith(media);
    const images: ImageProcessor = {
      generateVariants: vi.fn<ImageProcessor['generateVariants']>().mockResolvedValue([
        { variant: MediaVariant.THUMBNAIL, storageKey: StorageKey.create('thumb') },
        { variant: MediaVariant.MEDIUM, storageKey: StorageKey.create('medium') },
      ]),
    };
    const events: DomainEventPublisher = {
      publishAll: vi.fn<DomainEventPublisher['publishAll']>(),
    };

    await new GenerateMediaVariantsUseCase(repo, images, events).execute({ mediaId });

    expect(media.status).toBe('ready');
    expect(media.variants.get(MediaVariant.ORIGINAL)?.value).toBe('media/original.png');
    expect(events.publishAll).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'media.uploaded', mediaId }),
    ]);
  });

  it('marks media failed and does not publish when processor throws', async () => {
    const media = mediaItem();
    const repo = repoWith(media);
    const images: ImageProcessor = {
      generateVariants: vi.fn<ImageProcessor['generateVariants']>().mockRejectedValue(
        new Error('bad image'),
      ),
    };
    const events: DomainEventPublisher = {
      publishAll: vi.fn<DomainEventPublisher['publishAll']>(),
    };

    await new GenerateMediaVariantsUseCase(repo, images, events).execute({ mediaId });

    expect(media.status).toBe('failed');
    expect(events.publishAll).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(media);
  });
});
