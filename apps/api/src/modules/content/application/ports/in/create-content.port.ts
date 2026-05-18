import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';

export interface CreateContentUseCase {
  execute(command: CreateContentCommand): Promise<CreateContentResult>;
}

export type CreateContentCommand = {
  type: ContentType;
  title: string;
  actorId: string;
  actorRole: string;
  actorIp?: string;
  tags?: string[];
  category?: string | null;
  parentId?: string | null;
};

export type CreateContentResult = {
  contentId: string;
  slug: string;
  status: ContentStatus;
};
