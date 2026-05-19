import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createContent,
  deleteContent,
  submitForReview,
  publishContent,
  unpublishContent,
  updateContent,
} from '../api/content.api';
import type { ContentItem } from '../types/content.types';

export function useCreateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: ContentItem['type']; title: string }) => createContent(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function useSubmitForReview(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitForReview(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', id] });
      void queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function usePublishContent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => publishContent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', id] });
      void queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function useUnpublishContent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unpublishContent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', id] });
      void queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function useUpdateContent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ContentItem>) => updateContent(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', id] });
    },
  });
}
