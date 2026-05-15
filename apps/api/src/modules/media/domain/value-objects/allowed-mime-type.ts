import { UnsupportedMediaTypeError } from '../errors';

const AllowedMimeTypeValues = {
  IMAGE_PNG: 'image/png',
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_WEBP: 'image/webp',
  IMAGE_GIF: 'image/gif',
  IMAGE_SVG: 'image/svg+xml',
  APPLICATION_PDF: 'application/pdf',
} as const;

export type AllowedMimeType =
  (typeof AllowedMimeTypeValues)[keyof typeof AllowedMimeTypeValues];

const allowedMimeTypes = Object.values(AllowedMimeTypeValues);

export const AllowedMimeType = {
  ...AllowedMimeTypeValues,

  fromString(raw: string): AllowedMimeType {
    if (allowedMimeTypes.includes(raw as AllowedMimeType)) {
      return raw as AllowedMimeType;
    }

    throw new UnsupportedMediaTypeError(raw);
  },

  isImage(mime: AllowedMimeType): boolean {
    return (
      mime === AllowedMimeType.IMAGE_PNG ||
      mime === AllowedMimeType.IMAGE_JPEG ||
      mime === AllowedMimeType.IMAGE_WEBP ||
      mime === AllowedMimeType.IMAGE_GIF
    );
  },

  requiresSanitization(mime: AllowedMimeType): boolean {
    return mime === AllowedMimeType.IMAGE_SVG;
  },

  allowedExtensions(): Record<AllowedMimeType, string[]> {
    return {
      [AllowedMimeType.IMAGE_PNG]: ['png'],
      [AllowedMimeType.IMAGE_JPEG]: ['jpg', 'jpeg'],
      [AllowedMimeType.IMAGE_WEBP]: ['webp'],
      [AllowedMimeType.IMAGE_GIF]: ['gif'],
      [AllowedMimeType.IMAGE_SVG]: ['svg'],
      [AllowedMimeType.APPLICATION_PDF]: ['pdf'],
    };
  },
} as const;
