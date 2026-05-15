import { DomainEventPublisher } from '../../../../shared/ports/event-publisher.port';

import { MediaUploadedEvent } from '../../domain/events';
import { MediaNotFoundError } from '../../domain/errors';
import { MediaId, MediaVariant } from '../../domain/value-objects';
import {
  GenerateMediaVariantsCommand,
  GenerateMediaVariantsUseCase as GenerateMediaVariantsPort,
} from '../ports/in';
import { ImageProcessor, MediaRepository } from '../ports/out';

export class GenerateMediaVariantsUseCase implements GenerateMediaVariantsPort {
  constructor(
    private readonly media: MediaRepository,
    private readonly images: ImageProcessor,
    private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: GenerateMediaVariantsCommand): Promise<void> {
    const media = await this.media.findById(MediaId.create(command.mediaId));
    if (media === null) {
      throw new MediaNotFoundError(command.mediaId);
    }
    if (media.status !== 'pending') {
      return;
    }

    try {
      const generated = await this.images.generateVariants({
        originalStorageKey: media.storageKey.value,
        mediaId: media.id.value,
        mimeType: media.mimeType,
      });
      const variants = new Map(
        generated.map((result) => [result.variant, result.storageKey]),
      );
      variants.set(MediaVariant.ORIGINAL, media.storageKey);

      media.markReady(variants);
      await this.media.save(media);
      await this.events.publishAll([
        new MediaUploadedEvent(
          media.id.value,
          media.filename,
          media.mimeType,
          media.uploadedBy,
          media.storageKey.value,
        ),
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      media.markFailed(message);
      await this.media.save(media);
    }
  }
}
