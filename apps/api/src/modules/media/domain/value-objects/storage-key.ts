import { MediaId } from './media-id';

export class StorageKey {
  private constructor(readonly value: string) {}

  static create(key: string): StorageKey {
    const value = key.trim();
    if (value.length === 0) {
      throw new Error('Storage key cannot be empty');
    }

    return new StorageKey(value);
  }

  static generate(mediaId: MediaId, filename: string, now: number): StorageKey {
    const sanitizedFilename = filename
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    return StorageKey.create(
      `media/${mediaId.value}/${String(now)}-${sanitizedFilename}`,
    );
  }
}
