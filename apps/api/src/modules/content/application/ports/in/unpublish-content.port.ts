import { ContentStatus } from '../../../domain/value-objects/content-status.vo';

export interface UnpublishContentUseCase {
  execute(command: UnpublishContentCommand): Promise<UnpublishContentResult>;
}

export type UnpublishContentCommand = {
  contentId: string;
  actorId: string;
  actorRole: string;
};

export type UnpublishContentResult = {
  contentId: string;
  status: ContentStatus;
};
