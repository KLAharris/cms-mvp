import { ContentStatus } from '../../../domain/value-objects/content-status.vo';

export interface RevertContentUseCase {
  execute(command: RevertContentCommand): Promise<RevertContentResult>;
}

export type RevertContentCommand = {
  contentId: string;
  versionNo: number;
  actorId: string;
  actorRole: string;
};

export type RevertContentResult = {
  contentId: string;
  status: ContentStatus;
  newVersionNo: number;
};
