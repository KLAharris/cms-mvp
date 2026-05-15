import { describe, expect, it } from 'vitest';

import {
  FileSizeLimitExceededError,
  MediaAlreadyFinalizedError,
  MediaItem,
  MediaVariant,
  StorageKey,
  UnsupportedMediaTypeError,
  VariantGenerationFailedError,
} from '../../../../../src/modules/media/domain';

const mediaId = '11111111-1111-4111-8111-111111111111';

function createMedia(overrides: Partial<Parameters<typeof MediaItem.create>[0]> = {}) {
  return MediaItem.create({
    id: mediaId,
    filename: 'hero.png',
    mimeType: 'image/png',
    sizeBytes: 100,
    maxSizeBytes: 1000,
    storageKey: 'media/original.png',
    uploadedBy: 'user-1',
    uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

describe('MediaItem', () => {
  it('create sets pending status, empty variants, and uploadedAt', () => {
    const media = createMedia();

    expect(media.status).toBe('pending');
    expect(media.variants.size).toBe(0);
    expect(media.uploadedAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('rejects invalid mime type', () => {
    expect(() => createMedia({ mimeType: 'text/plain' })).toThrow(
      UnsupportedMediaTypeError,
    );
  });

  it('rejects oversized files', () => {
    expect(() => createMedia({ sizeBytes: 1001 })).toThrow(
      FileSizeLimitExceededError,
    );
  });

  it('requires thumbnail and medium variants for image media', () => {
    const media = createMedia();

    expect(() => {
      media.markReady(
        new Map([[MediaVariant.THUMBNAIL, StorageKey.create('thumb.png')]]),
      );
    }).toThrow(VariantGenerationFailedError);
  });

  it('accepts empty variants for PDF media', () => {
    const media = createMedia({
      filename: 'doc.pdf',
      mimeType: 'application/pdf',
      storageKey: 'media/doc.pdf',
    });

    media.markReady(new Map());

    expect(media.status).toBe('ready');
  });

  it('throws when markReady is called after finalization', () => {
    const media = createMedia({
      filename: 'doc.pdf',
      mimeType: 'application/pdf',
      storageKey: 'media/doc.pdf',
    });
    media.markReady(new Map());

    expect(() => {
      media.markReady(new Map());
    }).toThrow(MediaAlreadyFinalizedError);
  });

  it('sets failed status', () => {
    const media = createMedia();

    media.markFailed('processor failed');

    expect(media.status).toBe('failed');
  });

  it('checks ownership', () => {
    const media = createMedia();

    expect(media.isOwnedBy('user-1')).toBe(true);
    expect(media.isOwnedBy('user-2')).toBe(false);
  });
});
