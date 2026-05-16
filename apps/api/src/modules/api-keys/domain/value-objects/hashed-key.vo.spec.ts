import { describe, expect, it } from 'vitest';

import { ApiKeyDomainError } from '../errors';
import { HashedKey } from './hashed-key.vo';

describe('HashedKey', () => {
  it('creates successfully with a valid hash string', () => {
    expect(HashedKey.create('stored-hash').value).toBe('stored-hash');
  });

  it('throws ApiKeyDomainError for an empty string', () => {
    expect(() => HashedKey.create('')).toThrow(ApiKeyDomainError);
  });
});
