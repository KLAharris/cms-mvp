import { describe, expect, it } from 'vitest';

import { AltText, Caption } from '../../../../../src/modules/media/domain';

describe('media text metadata', () => {
  it('rejects alt text over 500 characters', () => {
    expect(() => AltText.create('a'.repeat(501))).toThrow(
      'Alt text cannot exceed 500 characters',
    );
  });

  it('rejects captions over 1000 characters', () => {
    expect(() => Caption.create('a'.repeat(1001))).toThrow(
      'Caption cannot exceed 1000 characters',
    );
  });
});
