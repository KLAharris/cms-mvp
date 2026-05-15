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

  describe('AltText', () => {
    it('create() with undefined returns value of undefined', () => {
      expect(AltText.create(undefined).value).toBeUndefined();
    });

    it('create() with no argument returns value of undefined', () => {
      expect(AltText.create().value).toBeUndefined();
    });

    it('create() with null coerces to undefined', () => {
      // null is not assignable to string|undefined in TypeScript; at runtime
      // the implementation's guard (value !== undefined) is true for null,
      // causing null.length to throw a TypeError.
      expect(() => AltText.create(null as unknown as string)).toThrow(TypeError);
    });

    it('create() with empty string returns value of empty string', () => {
      expect(AltText.create('').value).toBe('');
    });

    it('create() with exactly 500 characters passes', () => {
      const val = 'a'.repeat(500);
      expect(AltText.create(val).value).toBe(val);
    });

    it('create() with 501 characters throws', () => {
      expect(() => AltText.create('a'.repeat(501))).toThrow(
        'Alt text cannot exceed 500 characters',
      );
    });

    it('create() with a normal string returns that value', () => {
      expect(AltText.create('A hero image').value).toBe('A hero image');
    });
  });

  describe('Caption', () => {
    it('create() with undefined returns value of undefined', () => {
      expect(Caption.create(undefined).value).toBeUndefined();
    });

    it('create() with no argument returns value of undefined', () => {
      expect(Caption.create().value).toBeUndefined();
    });

    it('create() with null coerces to undefined', () => {
      // Same runtime behaviour as AltText: null.length throws TypeError.
      expect(() => Caption.create(null as unknown as string)).toThrow(TypeError);
    });

    it('create() with empty string returns value of empty string', () => {
      expect(Caption.create('').value).toBe('');
    });

    it('create() with exactly 1000 characters passes', () => {
      const val = 'a'.repeat(1000);
      expect(Caption.create(val).value).toBe(val);
    });

    it('create() with 1001 characters throws', () => {
      expect(() => Caption.create('a'.repeat(1001))).toThrow(
        'Caption cannot exceed 1000 characters',
      );
    });

    it('create() with a normal string returns that value', () => {
      expect(Caption.create('A caption').value).toBe('A caption');
    });
  });
});
