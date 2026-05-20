import { api } from '../../../shared/api/api';
import type {
  ContentItem,
  ContentListParams,
  ContentListResponse,
} from '../types/content.types';

export interface UpdateContentDto {
  title?: string;
  slug?: string;
  body?: unknown;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  category?: string | null;
  parentId?: string | null;
  featuredImageId?: string | null;
  socialImageId?: string | null;
}

type ListEnvelope = {
  data: ContentItem[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
};

export async function listContent(params: ContentListParams): Promise<ContentListResponse> {
  const response = await api.get<ListEnvelope>('/api/admin/content', { params });
  return {
    items: response.data.data,
    total: response.data.pagination.total,
    page: response.data.pagination.page,
    pageSize: response.data.pagination.page_size,
  };
}

export async function getContent(id: string): Promise<ContentItem> {
  const response = await api.get<{ data: ContentItem }>(`/api/admin/content/${id}`);
  return response.data.data;
}

export async function createContent(data: {
  type: ContentItem['type'];
  title: string;
}): Promise<ContentItem> {
  const response = await api.post<{ data: ContentItem }>('/api/admin/content', data);
  return response.data.data;
}

export async function updateContent(
  id: string,
  data: UpdateContentDto,
): Promise<ContentItem> {
  const response = await api.patch<{ data: ContentItem }>(`/api/admin/content/${id}`, data);
  return response.data.data;
}

export async function deleteContent(id: string): Promise<void> {
  await api.delete(`/api/admin/content/${id}`);
}

export async function submitForReview(id: string): Promise<ContentItem> {
  const response = await api.post<{ data: ContentItem }>(`/api/admin/content/${id}/submit`);
  return response.data.data;
}

export async function publishContent(id: string): Promise<ContentItem> {
  const response = await api.post<{ data: ContentItem }>(`/api/admin/content/${id}/publish`);
  return response.data.data;
}

export async function unpublishContent(id: string): Promise<ContentItem> {
  const response = await api.post<{ data: ContentItem }>(`/api/admin/content/${id}/unpublish`);
  return response.data.data;
}

export async function scheduleContent(
  id: string,
  scheduledAt: string,
): Promise<ContentItem> {
  const response = await api.post<{ data: ContentItem }>(`/api/admin/content/${id}/schedule`, {
    scheduledAt,
  });
  return response.data.data;
}

export async function revertContent(id: string, versionNo: number): Promise<ContentItem> {
  const response = await api.post<{ data: ContentItem }>(
    `/api/admin/content/${id}/revert/${String(versionNo)}`,
  );
  return response.data.data;
}
