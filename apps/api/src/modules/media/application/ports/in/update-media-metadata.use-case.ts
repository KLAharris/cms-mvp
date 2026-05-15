import { MediaItemDto } from '../../dto';

export interface UpdateMediaMetadataCommand {
  mediaId: string;
  altText?: string;
  caption?: string;
  requestedBy: string;
}

export interface UpdateMediaMetadataUseCase {
  execute(command: UpdateMediaMetadataCommand): Promise<MediaItemDto>;
}
