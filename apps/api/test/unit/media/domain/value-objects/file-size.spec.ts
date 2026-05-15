import { describe, expect, it } from 'vitest';

import {
  FileSize,
  FileSizeLimitExceededError,
} from '../../../../../src/modules/media/domain';

describe('FileSize', () => {
  it('accepts sizes under the limit', () => {
    expect(FileSize.create(10, 20).value).toBe(10);
  });

  it('accepts sizes equal to the limit', () => {
    expect(FileSize.create(20, 20).value).toBe(20);
  });

  it('rejects sizes over the limit', () => {
    expect(() => FileSize.create(21, 20)).toThrow(FileSizeLimitExceededError);
  });

  it('converts bytes to megabytes', () => {
    expect(FileSize.create(1024 * 1024).toMB()).toBe(1);
  });
});
