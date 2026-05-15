import { MediaItemDto } from '../../dto';

export interface UpdateMediaMetadataCommand {
  mediaId: string;
  altText?: string;
  caption?: string;
  requestedBy: string;
  requestedByRole: 'ADMIN' | 'EDITOR' | 'AUTHOR';
}

export interface UpdateMediaMetadataUseCase {
  execute(command: UpdateMediaMetadataCommand): Promise<MediaItemDto>;
}
