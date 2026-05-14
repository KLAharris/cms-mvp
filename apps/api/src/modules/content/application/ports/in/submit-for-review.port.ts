import { ContentStatus } from '../../../domain/value-objects/content-status.vo';

export interface SubmitForReviewUseCase {
  execute(command: SubmitForReviewCommand): Promise<SubmitForReviewResult>;
}

export type SubmitForReviewCommand = {
  contentId: string;
  actorId: string;
};

export type SubmitForReviewResult = {
  contentId: string;
  status: ContentStatus;
};
