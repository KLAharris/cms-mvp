import { describe, expect, it } from 'vitest';

import { UuidV4Generator } from './uuid-v4-generator.adapter';

describe('UuidV4Generator', () => {
  it('generates UUID v4 values', () => {
    expect(new UuidV4Generator().generate()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
