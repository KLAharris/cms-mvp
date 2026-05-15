import { MediaItem as PrismaMediaItem, Prisma } from '@prisma/client';

import { MediaItem, MediaStatus } from '../../../domain/entities';
import {
  AllowedMimeType,
  AltText,
  Caption,
  FileSize,
  MediaId,
  MediaVariant,
  StorageKey,
} from '../../../domain/value-objects';

type VariantRecord = Record<string, Prisma.JsonValue>;

function isVariantRecord(value: Prisma.JsonValue | null): value is VariantRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function variantsToDomain(value: Prisma.JsonValue | null): Map<MediaVariant, StorageKey> {
  const variants = new Map<MediaVariant, StorageKey>();
  if (!isVariantRecord(value)) {
    return variants;
  }

  for (const [variant, metadata] of Object.entries(value)) {
    if (
      Object.values(MediaVariant).includes(variant as MediaVariant) &&
      typeof metadata === 'object' &&
      metadata !== null &&
      'key' in metadata &&
      typeof metadata.key === 'string'
    ) {
      variants.set(variant as MediaVariant, StorageKey.create(metadata.key));
    }
  }

  return variants;
}

function variantsToRecord(media: MediaItem): Prisma.InputJsonObject | typeof Prisma.JsonNull {
  if (media.variants.size === 0) {
    return Prisma.JsonNull;
  }

  const variants: Record<string, Prisma.InputJsonValue> = {};
  for (const [variant, storageKey] of media.variants.entries()) {
    variants[variant] = {
      key: storageKey.value,
      w: variant === MediaVariant.ORIGINAL ? media.width ?? 0 : 0,
      h: variant === MediaVariant.ORIGINAL ? media.height ?? 0 : 0,
    };
  }

  return variants;
}

export const MediaPersistenceMapper = {
  toDomain(record: PrismaMediaItem): MediaItem {
    return MediaItem.reconstitute({
      id: MediaId.create(record.id),
      filename: record.filename,
      mimeType: AllowedMimeType.fromString(record.mimeType),
      size: FileSize.create(Number(record.sizeBytes)),
      storageKey: StorageKey.create(record.storageKey),
      altText: AltText.create(record.altText ?? undefined),
      caption: Caption.create(record.caption ?? undefined),
      uploadedBy: record.uploadedBy,
      uploadedAt: record.uploadedAt,
      status: record.status as MediaStatus,
      variants: variantsToDomain(record.variants),
      width: record.width ?? undefined,
      height: record.height ?? undefined,
    });
  },

  toRecord(media: MediaItem): Prisma.MediaItemUncheckedCreateInput {
    return {
      id: media.id.value,
      storageKey: media.storageKey.value,
      filename: media.filename,
      mimeType: media.mimeType,
      sizeBytes: BigInt(media.size.value),
      width: media.width,
      height: media.height,
      altText: media.altText.value,
      caption: media.caption.value,
      status: media.status,
      variants: variantsToRecord(media),
      uploadedBy: media.uploadedBy,
      uploadedAt: media.uploadedAt,
    };
  },
};
