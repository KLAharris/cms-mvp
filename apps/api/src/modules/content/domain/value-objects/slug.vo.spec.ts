import { describe, expect, it } from 'vitest';

import { InvalidSlugError, Slug } from './slug.vo';

describe('Slug', () => {
  it.each(['my-article', 'hello', 'abc-123', 'a1b2c3'])(
    'create() accepts %s',
    (value) => {
      expect(Slug.create(value).value).toBe(value);
    },
  );

  it('create() lowercases and trims before validating', () => {
    expect(Slug.create('  HELLO  ').value).toBe('hello');
  });

  it.each(['My Article', 'my article', 'my--article', '-start', 'end-', ''])(
    'create() throws InvalidSlugError for %s',
    (value) => {
      expect(() => Slug.create(value)).toThrow(InvalidSlugError);
    },
  );

  it.each([
    ['My First Article!', 'my-first-article'],
    ['Hello World 2024', 'hello-world-2024'],
    ['  spaces  around  ', 'spaces-around'],
    ['special @#$% chars', 'special-chars'],
    ['multiple---dashes', 'multiple-dashes'],
  ])('fromTitle(%s) returns %s', (title, expected) => {
    expect(Slug.fromTitle(title).value).toBe(expected);
  });

  it.each(['', '!@#$'])('fromTitle(%s) throws InvalidSlugError', (title) => {
    expect(() => Slug.fromTitle(title)).toThrow(InvalidSlugError);
  });

  it('equals() true for same value, false for different', () => {
    expect(Slug.create('same').equals(Slug.create('same'))).toBe(true);
    expect(Slug.create('same').equals(Slug.create('different'))).toBe(false);
  });
});
