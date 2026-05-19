import { api } from '../../../shared/api/api';
import type {
  ContentItem,
  ContentListParams,
  ContentListResponse,
} from '../types/content.types';

export async function listContent(params: ContentListParams): Promise<ContentListResponse> {
  const response = await api.get<ContentListResponse>('/api/admin/content', { params });
  return response.data;
}

export async function getContent(id: string): Promise<ContentItem> {
  const response = await api.get<ContentItem>(`/api/admin/content/${id}`);
  return response.data;
}

export async function createContent(data: {
  type: ContentItem['type'];
  title: string;
}): Promise<ContentItem> {
  const response = await api.post<ContentItem>('/api/admin/content', data);
  return response.data;
}

export async function updateContent(
  id: string,
  data: Partial<ContentItem>,
): Promise<ContentItem> {
  const response = await api.patch<ContentItem>(`/api/admin/content/${id}`, data);
  return response.data;
}

export async function deleteContent(id: string): Promise<void> {
  await api.delete(`/api/admin/content/${id}`);
}

export async function submitForReview(id: string): Promise<ContentItem> {
  const response = await api.post<ContentItem>(`/api/admin/content/${id}/submit`);
  return response.data;
}

export async function publishContent(id: string): Promise<ContentItem> {
  const response = await api.post<ContentItem>(`/api/admin/content/${id}/publish`);
  return response.data;
}

export async function unpublishContent(id: string): Promise<ContentItem> {
  const response = await api.post<ContentItem>(`/api/admin/content/${id}/unpublish`);
  return response.data;
}

export async function scheduleContent(
  id: string,
  scheduledAt: string,
): Promise<ContentItem> {
  const response = await api.patch<ContentItem>(`/api/admin/content/${id}/schedule`, {
    scheduledAt,
  });
  return response.data;
}

export async function revertContent(id: string, versionId: string): Promise<ContentItem> {
  const response = await api.post<ContentItem>(
    `/api/admin/content/${id}/revert/${versionId}`,
  );
  return response.data;
}
