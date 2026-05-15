import { describe, expect, it } from 'vitest';

import { MediaId, StorageKey } from '../../../../../src/modules/media/domain';

describe('StorageKey', () => {
  it('rejects empty keys', () => {
    expect(() => StorageKey.create(' ')).toThrow('Storage key cannot be empty');
  });

  it('generates keys with media id and sanitized filename', () => {
    const mediaId = MediaId.create('11111111-1111-4111-8111-111111111111');

    expect(StorageKey.generate(mediaId, 'Hero Image @ 2X.PNG', 123).value).toBe(
      'media/11111111-1111-4111-8111-111111111111/123-hero-image-2x.png',
    );
  });
});
