import type { ContentListParams, ContentStatus, ContentType } from '../types/content.types';

export type FilterState = {
  status: ContentStatus | null;
  mine: boolean;
  lastDays: number | null;
  title: string;
  page: number;
};

export function buildContentParams(
  type: ContentType,
  filters: FilterState,
): ContentListParams {
  const params: ContentListParams = {
    type,
    page: filters.page,
    pageSize: 20,
  };

  if (filters.status !== null) {
    params.status = filters.status;
  }

  if (filters.mine) {
    params.mine = true;
  }

  if (filters.lastDays !== null) {
    params.lastDays = filters.lastDays;
  }

  if (filters.title.length > 0) {
    params.titleSearch = filters.title;
  }

  return params;
}
