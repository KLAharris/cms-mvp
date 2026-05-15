import { MediaItem } from '../../domain/entities';
import { AllowedMimeType } from '../../domain/value-objects';

export interface MediaItemDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  altText?: string;
  caption?: string;
  uploadedBy: string;
  uploadedAt: Date;
  status: 'pending' | 'ready' | 'failed';
  variants: Record<string, string>;
  requiresSanitization: boolean;
  width?: number;
  height?: number;
}

export function toMediaItemDto(media: MediaItem): MediaItemDto {
  return {
    id: media.id.value,
    filename: media.filename,
    mimeType: media.mimeType,
    sizeBytes: media.size.value,
    altText: media.altText.value,
    caption: media.caption.value,
    uploadedBy: media.uploadedBy,
    uploadedAt: media.uploadedAt,
    status: media.status,
    variants: Object.fromEntries(
      Array.from(media.variants.entries()).map(([variant, storageKey]) => [
        variant,
        storageKey.value,
      ]),
    ),
    requiresSanitization: AllowedMimeType.requiresSanitization(media.mimeType),
    width: media.width,
    height: media.height,
  };
}
