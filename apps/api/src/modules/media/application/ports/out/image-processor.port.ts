import { MediaVariant, StorageKey } from '../../../domain/value-objects';

export interface VariantResult {
  variant: MediaVariant;
  storageKey: StorageKey;
}

export interface ImageProcessor {
  generateVariants(params: {
    originalStorageKey: string;
    mediaId: string;
    mimeType: string;
  }): Promise<{ variants: VariantResult[]; width?: number; height?: number }>;
}
