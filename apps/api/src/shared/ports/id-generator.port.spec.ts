import { describe, expect, it } from 'vitest';

import { ID_GENERATOR, IdGenerator } from './id-generator.port';

describe('IdGenerator port', () => {
  it('defines a generator contract and token', () => {
    const generator: IdGenerator = { generate: () => 'id-1' };

    expect(generator.generate()).toBe('id-1');
    expect(ID_GENERATOR.description).toBe('IdGenerator');
  });
});
