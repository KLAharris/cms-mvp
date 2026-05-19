import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';

import { deleteMedia, bulkDeleteMedia, listMedia, updateMedia } from '../api/media.api';
import type { MediaListParams, UpdateMediaRequest } from '../types/media.types';

export const MEDIA_QUERY_KEY = 'media';

export function useMedia(params: MediaListParams) {
  return useQuery({
    queryKey: [MEDIA_QUERY_KEY, params],
    queryFn: () => listMedia(params),
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] });
    },
  });
}

export function useBulkDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteMedia(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] });
    },
  });
}

export function useUpdateMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMediaRequest }) =>
      updateMedia(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] });
    },
  });
}
