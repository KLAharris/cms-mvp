import { api } from '../../../shared/api/api';
import type {
  FinalizeMediaRequest,
  MediaItem,
  MediaListParams,
  MediaListResponse,
  PresignRequest,
  PresignResponse,
  UpdateMediaRequest,
} from '../types/media.types';

export async function listMedia(params: MediaListParams): Promise<MediaListResponse> {
  const response = await api.get<MediaListResponse>('/api/admin/media', { params });
  return response.data;
}

export async function getMedia(id: string): Promise<MediaItem> {
  const response = await api.get<MediaItem>(`/api/admin/media/${id}`);
  return response.data;
}

export async function presignMedia(req: PresignRequest): Promise<PresignResponse> {
  const response = await api.post<PresignResponse>('/api/admin/media/presign', req);
  return response.data;
}

export async function uploadToStorage(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!response.ok) {
    throw new Error(`Upload failed: ${String(response.status)}`);
  }
}

export async function finalizeMedia(req: FinalizeMediaRequest): Promise<MediaItem> {
  const response = await api.post<MediaItem>('/api/admin/media', req);
  return response.data;
}

export async function updateMedia(id: string, data: UpdateMediaRequest): Promise<MediaItem> {
  const response = await api.patch<MediaItem>(`/api/admin/media/${id}`, data);
  return response.data;
}

export async function deleteMedia(id: string): Promise<void> {
  await api.delete(`/api/admin/media/${id}`);
}

export async function bulkDeleteMedia(ids: string[]): Promise<void> {
  await api.delete('/api/admin/media', { data: { ids } });
}
