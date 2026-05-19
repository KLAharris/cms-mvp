export type MediaMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif'
  | 'image/svg+xml'
  | 'application/pdf';

export const ALLOWED_MEDIA_TYPES: MediaMimeType[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
];

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export type MediaFilterType = 'all' | 'image' | 'pdf';

export interface MediaUploader {
  id: string;
  name: string;
  email: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  altText?: string;
  caption?: string;
  width?: number;
  height?: number;
  uploadedBy: MediaUploader;
  usedInCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaListParams {
  search?: string;
  type?: MediaFilterType;
  page?: number;
  pageSize?: number;
}

export interface MediaListResponse {
  items: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PresignRequest {
  filename: string;
  mimeType: string;
}

export interface PresignResponse {
  uploadUrl: string;
  key: string;
}

export interface FinalizeMediaRequest {
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  altText?: string;
}

export interface UpdateMediaRequest {
  altText?: string;
  caption?: string;
}

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface UploadState {
  status: UploadStatus;
  progress: number;
  error?: string;
}
