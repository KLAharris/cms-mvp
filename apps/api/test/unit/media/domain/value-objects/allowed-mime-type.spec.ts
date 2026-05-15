import { describe, expect, it } from 'vitest';

import {
  AllowedMimeType,
  UnsupportedMediaTypeError,
} from '../../../../../src/modules/media/domain';

describe('AllowedMimeType', () => {
  it('accepts supported media types', () => {
    expect(AllowedMimeType.fromString('image/png')).toBe(AllowedMimeType.IMAGE_PNG);
    expect(AllowedMimeType.fromString('image/jpeg')).toBe(AllowedMimeType.IMAGE_JPEG);
    expect(AllowedMimeType.fromString('image/webp')).toBe(AllowedMimeType.IMAGE_WEBP);
    expect(AllowedMimeType.fromString('image/gif')).toBe(AllowedMimeType.IMAGE_GIF);
    expect(AllowedMimeType.fromString('image/svg+xml')).toBe(AllowedMimeType.IMAGE_SVG);
    expect(AllowedMimeType.fromString('application/pdf')).toBe(
      AllowedMimeType.APPLICATION_PDF,
    );
  });

  it('rejects unsupported media types', () => {
    expect(() => AllowedMimeType.fromString('text/plain')).toThrow(
      UnsupportedMediaTypeError,
    );
  });

  it('identifies raster images only', () => {
    expect(AllowedMimeType.isImage(AllowedMimeType.IMAGE_PNG)).toBe(true);
    expect(AllowedMimeType.isImage(AllowedMimeType.IMAGE_JPEG)).toBe(true);
    expect(AllowedMimeType.isImage(AllowedMimeType.IMAGE_WEBP)).toBe(true);
    expect(AllowedMimeType.isImage(AllowedMimeType.IMAGE_GIF)).toBe(true);
    expect(AllowedMimeType.isImage(AllowedMimeType.IMAGE_SVG)).toBe(false);
    expect(AllowedMimeType.isImage(AllowedMimeType.APPLICATION_PDF)).toBe(false);
  });

  it('requires sanitization only for SVG', () => {
    expect(AllowedMimeType.requiresSanitization(AllowedMimeType.IMAGE_SVG)).toBe(
      true,
    );
    expect(AllowedMimeType.requiresSanitization(AllowedMimeType.IMAGE_PNG)).toBe(
      false,
    );
  });

  it('maps extensions for each allowed type', () => {
    expect(AllowedMimeType.allowedExtensions()[AllowedMimeType.IMAGE_JPEG]).toEqual([
      'jpg',
      'jpeg',
    ]);
    expect(AllowedMimeType.allowedExtensions()[AllowedMimeType.APPLICATION_PDF]).toEqual([
      'pdf',
    ]);
  });
});
