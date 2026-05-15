import { FileSizeLimitExceededError } from '../errors';

export const DEFAULT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export class FileSize {
  private constructor(readonly value: number) {}

  static create(
    bytes: number,
    maxBytes: number = DEFAULT_MAX_UPLOAD_BYTES,
  ): FileSize {
    if (!Number.isInteger(bytes) || bytes < 0) {
      throw new Error('File size must be a non-negative integer');
    }

    if (bytes > maxBytes) {
      throw new FileSizeLimitExceededError(bytes, maxBytes);
    }

    return new FileSize(bytes);
  }

  toMB(): number {
    return this.value / (1024 * 1024);
  }
}
