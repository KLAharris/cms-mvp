import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';

export interface CreateContentUseCase {
  execute(command: CreateContentCommand): Promise<CreateContentResult>;
}

export type CreateContentCommand = {
  type: ContentType;
  title: string;
  authorId: string;
};

export type CreateContentResult = {
  contentId: string;
  status: ContentStatus;
};
