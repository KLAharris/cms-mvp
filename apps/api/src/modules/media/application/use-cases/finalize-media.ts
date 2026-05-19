import {
  JobEnqueuer,
  MEDIA_VARIANT_QUEUE,
} from '../../../../shared/ports/job-enqueuer.port';

import { MediaNotFoundError, MediaAlreadyFinalizedError, MediaForbiddenError } from '../../domain/errors';
import { AllowedMimeType, MediaId, MediaVariant } from '../../domain/value-objects';
import {
  FinalizeMediaCommand,
  FinalizeMediaUseCase as FinalizeMediaPort,
} from '../ports/in';
import { MediaRepository, MimeValidator, ObjectStorage } from '../ports/out';

export class FinalizeMediaUseCase implements FinalizeMediaPort {
  constructor(
    private readonly media: MediaRepository,
    private readonly jobs: JobEnqueuer,
    private readonly storage: ObjectStorage,
    private readonly mimeValidator: MimeValidator,
  ) {}

  async execute(command: FinalizeMediaCommand): Promise<void> {
    const media = await this.media.findById(MediaId.create(command.mediaId));
    if (media === null) {
      throw new MediaNotFoundError(command.mediaId);
    }
    if (media.status !== 'pending') {
      throw new MediaAlreadyFinalizedError(command.mediaId);
    }

    if (
      command.requestedByRole === 'AUTHOR' &&
      !media.isOwnedBy(command.requestedBy)
    ) {
      throw new MediaForbiddenError('Authors can only finalize their own uploads');
    }

    const bytes = await this.storage.getObjectBytes(media.storageKey.value);
    this.mimeValidator.validateMimeConsistency({
      filename: media.filename,
      declaredMimeType: media.mimeType,
      bytes,
    });

    if (media.mimeType === AllowedMimeType.APPLICATION_PDF) {
      media.markReady(new Map([[MediaVariant.ORIGINAL, media.storageKey]]));
      await this.media.save(media);
      return;
    }

    // All images and SVG go through the worker (SVG requires sanitization per SEC-05)
    await this.jobs.enqueue(MEDIA_VARIANT_QUEUE, {
      type: 'generate-variants',
      data: { mediaId: media.id.value },
    });
    await this.media.save(media);
  }
}
