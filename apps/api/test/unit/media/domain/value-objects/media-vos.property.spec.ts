import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import {
  AllowedMimeType,
  AltText,
  Caption,
  FileSizeLimitExceededError,
  FileSize,
  StorageKey,
  UnsupportedMediaTypeError,
} from '../../../../../src/modules/media/domain';

const ALLOWED_MIME_TYPES: string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
];

describe('Property-based tests', () => {
  describe('FileSize', () => {
    it('accepts any integer in [1, maxBytes] and preserves value', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50_000 }),
          fc.integer({ min: 0, max: 10_000 }),
          (n, extra) => {
            const maxBytes = n + extra;
            const fs = FileSize.create(n, maxBytes);
            expect(fs.value).toBe(n);
          },
        ),
      );
    });

    it('accepts a value exactly equal to maxBytes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50_000 }),
          (maxBytes) => {
            expect(FileSize.create(maxBytes, maxBytes).value).toBe(maxBytes);
          },
        ),
      );
    });

    it('throws FileSizeLimitExceededError for any integer greater than maxBytes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 49_999 }),
          fc.integer({ min: 1, max: 1_000 }),
          (maxBytes, excess) => {
            expect(() => FileSize.create(maxBytes + excess, maxBytes)).toThrow(
              FileSizeLimitExceededError,
            );
          },
        ),
      );
    });
  });

  describe('AllowedMimeType', () => {
    it('throws UnsupportedMediaTypeError for any string not in the allowed list', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !ALLOWED_MIME_TYPES.includes(s)),
          (s) => {
            expect(() => AllowedMimeType.fromString(s)).toThrow(
              UnsupportedMediaTypeError,
            );
          },
        ),
      );
    });

    it('succeeds for every valid mime type in the allowed list', () => {
      for (const mime of ALLOWED_MIME_TYPES) {
        expect(AllowedMimeType.fromString(mime)).toBe(mime);
      }
    });
  });

  describe('StorageKey', () => {
    it('accepts any non-whitespace-only string and returns the trimmed value', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          (s) => {
            expect(StorageKey.create(s).value).toBe(s.trim());
          },
        ),
      );
    });

    it('throws for an empty string', () => {
      expect(() => StorageKey.create('')).toThrow('Storage key cannot be empty');
    });

    it('throws for any whitespace-only string', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[ \t\n]+$/),
          (s) => {
            expect(() => StorageKey.create(s)).toThrow('Storage key cannot be empty');
          },
        ),
      );
    });
  });

  describe('AltText', () => {
    it('succeeds for any string of length 0–500', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 500 }),
          (s) => {
            expect(AltText.create(s).value).toBe(s);
          },
        ),
      );
    });

    it('throws for any string of length 501 or more', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 501, maxLength: 1_000 }),
          (s) => {
            expect(() => AltText.create(s)).toThrow(
              'Alt text cannot exceed 500 characters',
            );
          },
        ),
      );
    });
  });

  describe('Caption', () => {
    it('succeeds for any string of length 0–1000', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 1_000 }),
          (s) => {
            expect(Caption.create(s).value).toBe(s);
          },
        ),
      );
    });

    it('throws for any string of length 1001 or more', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1_001, maxLength: 2_000 }),
          (s) => {
            expect(() => Caption.create(s)).toThrow(
              'Caption cannot exceed 1000 characters',
            );
          },
        ),
      );
    });
  });
});
