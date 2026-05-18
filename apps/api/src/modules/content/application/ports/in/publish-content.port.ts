import { ContentStatus } from '../../../domain/value-objects/content-status.vo';

export interface PublishContentUseCase {
  execute(command: PublishContentCommand): Promise<PublishContentResult>;
}

export type PublishContentCommand = {
  contentId: string;
  actorId: string;
  actorRole: string;
  actorIp?: string;
};

export type PublishContentResult = {
  contentId: string;
  status: ContentStatus;
  publishedAt: Date;
};
