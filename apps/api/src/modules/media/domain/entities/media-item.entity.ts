import {
  MediaAlreadyFinalizedError,
  VariantGenerationFailedError,
} from '../errors';
import {
  AllowedMimeType,
  AltText,
  Caption,
  FileSize,
  MediaId,
  MediaVariant,
  StorageKey,
} from '../value-objects';

export type MediaStatus = 'pending' | 'ready' | 'failed';

export type MediaItemCreateProps = {
  id?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  maxSizeBytes: number;
  storageKey: string;
  uploadedBy: string;
  uploadedAt?: Date;
  altText?: string;
  caption?: string;
};

export type MediaItemReconstituteProps = {
  id: MediaId;
  filename: string;
  mimeType: AllowedMimeType;
  size: FileSize;
  storageKey: StorageKey;
  altText: AltText;
  caption: Caption;
  uploadedBy: string;
  uploadedAt: Date;
  status: MediaStatus;
  variants: Map<MediaVariant, StorageKey>;
  width?: number;
  height?: number;
};

export class MediaItem {
  readonly id: MediaId;
  readonly filename: string;
  readonly mimeType: AllowedMimeType;
  readonly size: FileSize;
  readonly storageKey: StorageKey;
  altText: AltText;
  caption: Caption;
  readonly uploadedBy: string;
  readonly uploadedAt: Date;
  status: MediaStatus;
  variants: Map<MediaVariant, StorageKey>;
  width: number | undefined;
  height: number | undefined;

  private constructor(props: {
    id: MediaId;
    filename: string;
    mimeType: AllowedMimeType;
    size: FileSize;
    storageKey: StorageKey;
    altText: AltText;
    caption: Caption;
    uploadedBy: string;
    uploadedAt: Date;
    status: MediaStatus;
    variants: Map<MediaVariant, StorageKey>;
  }) {
    this.id = props.id;
    this.filename = props.filename;
    this.mimeType = props.mimeType;
    this.size = props.size;
    this.storageKey = props.storageKey;
    this.altText = props.altText;
    this.caption = props.caption;
    this.uploadedBy = props.uploadedBy;
    this.uploadedAt = props.uploadedAt;
    this.status = props.status;
    this.variants = props.variants;
    this.width = undefined;
    this.height = undefined;
  }

  static create(props: MediaItemCreateProps): MediaItem {
    return new MediaItem({
      id: MediaId.create(props.id),
      filename: props.filename,
      mimeType: AllowedMimeType.fromString(props.mimeType),
      size: FileSize.create(props.sizeBytes, props.maxSizeBytes),
      storageKey: StorageKey.create(props.storageKey),
      altText: AltText.create(props.altText),
      caption: Caption.create(props.caption),
      uploadedBy: props.uploadedBy,
      uploadedAt: props.uploadedAt ?? new Date(),
      status: 'pending',
      variants: new Map(),
    });
  }

  static reconstitute(props: MediaItemReconstituteProps): MediaItem {
    const media = new MediaItem(props);
    media.width = props.width;
    media.height = props.height;
    return media;
  }

  markReady(variants: Map<MediaVariant, StorageKey>, dimensions?: { width: number; height: number }): void {
    this.assertPending();

    if (
      AllowedMimeType.isImage(this.mimeType) &&
      (!variants.has(MediaVariant.THUMBNAIL) || !variants.has(MediaVariant.MEDIUM))
    ) {
      throw new VariantGenerationFailedError(
        this.id.value,
        'Image media requires thumbnail and medium variants',
      );
    }

    if (dimensions) {
      this.width = dimensions.width;
      this.height = dimensions.height;
    }

    this.status = 'ready';
    this.variants = variants;
  }

  markFailed(reason: string): void {
    void reason;
    this.assertPending();
    this.status = 'failed';
  }

  updateMetadata(altText?: string, caption?: string): void {
    this.altText = AltText.create(altText);
    this.caption = Caption.create(caption);
  }

  isOwnedBy(userId: string): boolean {
    return this.uploadedBy === userId;
  }

  private assertPending(): void {
    if (this.status !== 'pending') {
      throw new MediaAlreadyFinalizedError(this.id.value);
    }
  }
}
