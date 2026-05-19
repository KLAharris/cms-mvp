import { useQuery } from '@tanstack/react-query';
import { listContent } from '../api/content.api';
import type { ContentListParams, ContentListResponse } from '../types/content.types';

export function useContentList(params: ContentListParams) {
  return useQuery<ContentListResponse>({
    queryKey: ['content', params],
    queryFn: () => listContent(params),
  });
}
