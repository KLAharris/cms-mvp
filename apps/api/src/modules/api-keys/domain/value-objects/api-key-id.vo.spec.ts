import { describe, expect, it } from 'vitest';

import { ApiKeyDomainError } from '../errors';
import { ApiKeyId } from './api-key-id.vo';

describe('ApiKeyId', () => {
  it('creates successfully with a valid UUID', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';

    expect(ApiKeyId.create(id).value).toBe(id);
  });

  it('throws ApiKeyDomainError for an empty string', () => {
    expect(() => ApiKeyId.create('')).toThrow(ApiKeyDomainError);
  });

  it('throws ApiKeyDomainError for a non-UUID string', () => {
    expect(() => ApiKeyId.create('not-a-uuid')).toThrow(ApiKeyDomainError);
  });
});
