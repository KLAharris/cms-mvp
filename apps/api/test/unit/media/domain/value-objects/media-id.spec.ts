import { describe, expect, it } from 'vitest';

import { MediaId } from '../../../../../src/modules/media/domain';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('MediaId', () => {
  it('generates a valid UUID when no argument is provided', () => {
    const id = MediaId.create();
    expect(id.value).toMatch(UUID_RE);
  });

  it('returns the exact UUID string that was passed in', () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    expect(MediaId.create(uuid).value).toBe(uuid);
  });

  it('two no-arg calls produce different values', () => {
    const a = MediaId.create();
    const b = MediaId.create();
    expect(a.value).not.toBe(b.value);
  });

  it('value getter returns the underlying string', () => {
    const uuid = '22222222-2222-4222-8222-222222222222';
    const id = MediaId.create(uuid);
    expect(id.value).toBe(uuid);
  });
});
