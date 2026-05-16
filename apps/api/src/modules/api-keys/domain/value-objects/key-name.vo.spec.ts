import { describe, expect, it } from 'vitest';

import { ApiKeyDomainError } from '../errors';
import { KeyName } from './key-name.vo';

describe('KeyName', () => {
  it('creates successfully with a valid name', () => {
    expect(KeyName.create('Publishing API').value).toBe('Publishing API');
  });

  it('throws ApiKeyDomainError for an empty string', () => {
    expect(() => KeyName.create('')).toThrow(ApiKeyDomainError);
  });

  it('throws ApiKeyDomainError for whitespace only', () => {
    expect(() => KeyName.create('   ')).toThrow(ApiKeyDomainError);
  });

  it('throws ApiKeyDomainError when name exceeds 100 characters', () => {
    expect(() => KeyName.create('a'.repeat(101))).toThrow(ApiKeyDomainError);
  });

  it('trims name on creation', () => {
    expect(KeyName.create('  Publishing API  ').value).toBe('Publishing API');
  });
});
