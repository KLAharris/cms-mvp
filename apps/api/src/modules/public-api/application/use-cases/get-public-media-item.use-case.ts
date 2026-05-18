import { Inject, Injectable } from '@nestjs/common';

import {
  IPublicContentRepository,
  PublicMediaItem,
  PUBLIC_CONTENT_REPOSITORY,
} from '../ports/out/public-content-repository.port';

@Injectable()
export class GetPublicMediaItemUseCase {
  constructor(
    @Inject(PUBLIC_CONTENT_REPOSITORY)
    private readonly repo: IPublicContentRepository,
  ) {}

  async execute(id: string): Promise<PublicMediaItem | null> {
    return this.repo.getMediaById(id);
  }
}
