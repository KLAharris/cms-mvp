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

export interface MediaVariantUrl {
  url: string;
  expiresAt: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  altText?: string;
  caption?: string;
  uploadedBy: string;
  uploadedAt: string;
  status: string;
  width?: number;
  height?: number;
  requiresSanitization: boolean;
  variants: {
    original?: MediaVariantUrl;
    thumbnail?: MediaVariantUrl;
    medium?: MediaVariantUrl;
  };
}

export function getMediaUrl(item: MediaItem): string {
  return (
    item.variants.original?.url ??
    item.variants.medium?.url ??
    item.variants.thumbnail?.url ??
    ''
  );
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
  sizeBytes: number;
}

export interface PresignResponse {
  mediaId: string;
  uploadUrl: string;
  storageKey: string;
}

export interface FinalizeMediaRequest {
  mediaId: string;
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
