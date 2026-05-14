import { describe, expect, it } from 'vitest';

import { InvalidTagError, Tag } from './tag.vo';

describe('Tag', () => {
  it.each(['tech', 'javascript', 'web-dev', 'a'])(
    'create() accepts %s',
    (value) => {
      expect(Tag.create(value).value).toBe(value);
    },
  );

  it('create() auto-lowercases', () => {
    expect(Tag.create('Tech').value).toBe('tech');
  });

  it.each(['', '   ', 'a'.repeat(41)])(
    'create() throws InvalidTagError',
    (value) => {
      expect(() => Tag.create(value)).toThrow(InvalidTagError);
    },
  );

  it('equals() true for same value, false for different', () => {
    expect(Tag.create('tech').equals(Tag.create('tech'))).toBe(true);
    expect(Tag.create('tech').equals(Tag.create('news'))).toBe(false);
  });
});
