import { MediaForbiddenError, MediaNotFoundError } from '../../domain/errors';
import { MediaId } from '../../domain/value-objects';
import { MediaItemDto, toMediaItemDto } from '../dto';
import {
  UpdateMediaMetadataCommand,
  UpdateMediaMetadataUseCase as UpdateMediaMetadataPort,
} from '../ports/in';
import { MediaRepository } from '../ports/out';

export class UpdateMediaMetadataUseCase implements UpdateMediaMetadataPort {
  constructor(private readonly media: MediaRepository) {}

  async execute(command: UpdateMediaMetadataCommand): Promise<MediaItemDto> {
    const media = await this.media.findById(MediaId.create(command.mediaId));
    if (media === null) {
      throw new MediaNotFoundError(command.mediaId);
    }

    if (
      command.requestedByRole === 'AUTHOR' &&
      !media.isOwnedBy(command.requestedBy)
    ) {
      throw new MediaForbiddenError('Authors can only update metadata for their own media');
    }

    media.updateMetadata(command.altText, command.caption);
    await this.media.save(media);

    return toMediaItemDto(media);
  }
}
