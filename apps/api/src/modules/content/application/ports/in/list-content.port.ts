import {
  ContentSearchCriteria,
  PagedResult,
} from '../out/content-repository.port';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';

export interface ListContentUseCase {
  execute(command: ListContentCommand): Promise<ListContentResult>;
}

export type ListContentCommand = Partial<ContentSearchCriteria> & {
  actorId: string;
  actorRole: string;
};

export type ContentListItem = {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  status: ContentStatus;
  authorId: string;
  publishedAt: Date | null;
  updatedAt: Date;
};

export type ListContentResult = PagedResult<ContentListItem>;
