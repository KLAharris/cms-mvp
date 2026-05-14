import {
  ContentSearchCriteria,
  PagedResult,
} from '../out/content-repository.port';

export interface ListContentUseCase {
  execute(command: ListContentCommand): Promise<ListContentResult>;
}

export type ListContentCommand = ContentSearchCriteria;

export type ContentListItem = {
  contentId: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  updatedAt: Date;
};

export type ListContentResult = PagedResult<ContentListItem>;
