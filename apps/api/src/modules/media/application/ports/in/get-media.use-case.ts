import { MediaItemDto } from '../../dto';

export interface GetMediaQuery {
  mediaId: string;
}

export interface GetMediaUseCase {
  execute(query: GetMediaQuery): Promise<MediaItemDto>;
}
