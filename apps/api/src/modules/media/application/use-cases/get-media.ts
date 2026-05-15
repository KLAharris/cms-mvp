import { MediaItemDto, toMediaItemDto } from '../dto';
import { MediaNotFoundError } from '../../domain/errors';
import { MediaId } from '../../domain/value-objects';
import { GetMediaQuery, GetMediaUseCase as GetMediaPort } from '../ports/in';
import { MediaRepository } from '../ports/out';

export class GetMediaUseCase implements GetMediaPort {
  constructor(private readonly media: MediaRepository) {}

  async execute(query: GetMediaQuery): Promise<MediaItemDto> {
    const item = await this.media.findById(MediaId.create(query.mediaId));
    if (item === null) {
      throw new MediaNotFoundError(query.mediaId);
    }
    return toMediaItemDto(item);
  }
}
