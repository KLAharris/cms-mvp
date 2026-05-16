import { describe, expect, it } from 'vitest';

import { ApiKeyAlreadyRevokedError } from '../errors';
import { ApiKey } from './api-key.entity';

const apiKeyId = '123e4567-e89b-42d3-a456-426614174000';
const createdById = '223e4567-e89b-42d3-a456-426614174000';
const createdAt = new Date('2026-05-16T00:00:00.000Z');

function createApiKey(): ApiKey {
  return ApiKey.create({
    id: apiKeyId,
    name: 'Publishing API',
    keyHash: 'stored-hash',
    createdById,
    createdAt,
  });
}

describe('ApiKey', () => {
  it('create() creates a valid ApiKey with all fields set correctly', () => {
    const apiKey = createApiKey();

    expect(apiKey.id.value).toBe(apiKeyId);
    expect(apiKey.name.value).toBe('Publishing API');
    expect(apiKey.keyHash.value).toBe('stored-hash');
    expect(apiKey.createdById).toBe(createdById);
    expect(apiKey.createdAt).toBe(createdAt);
  });

  it('create() sets isRevoked to false on creation', () => {
    expect(createApiKey().isRevoked).toBe(false);
  });

  it('create() sets lastUsedAt to null on creation', () => {
    expect(createApiKey().lastUsedAt).toBeNull();
  });

  it('revoke() sets revokedAt to the provided date', () => {
    const apiKey = createApiKey();
    const revokedAt = new Date('2026-05-16T01:00:00.000Z');

    apiKey.revoke(revokedAt);

    expect(apiKey.revokedAt).toBe(revokedAt);
  });

  it('revoke() sets isRevoked to true after revoke', () => {
    const apiKey = createApiKey();

    apiKey.revoke(new Date('2026-05-16T01:00:00.000Z'));

    expect(apiKey.isRevoked).toBe(true);
  });

  it('revoke() throws ApiKeyAlreadyRevokedError if called twice', () => {
    const apiKey = createApiKey();

    apiKey.revoke(new Date('2026-05-16T01:00:00.000Z'));

    expect(() => {
      apiKey.revoke(new Date('2026-05-16T02:00:00.000Z'));
    }).toThrow(ApiKeyAlreadyRevokedError);
  });

  it('recordUsage() sets lastUsedAt to the provided date', () => {
    const apiKey = createApiKey();
    const lastUsedAt = new Date('2026-05-16T03:00:00.000Z');

    apiKey.recordUsage(lastUsedAt);

    expect(apiKey.lastUsedAt).toBe(lastUsedAt);
  });

  it('recordUsage() can be called multiple times', () => {
    const apiKey = createApiKey();
    const firstUsage = new Date('2026-05-16T03:00:00.000Z');
    const secondUsage = new Date('2026-05-16T04:00:00.000Z');

    apiKey.recordUsage(firstUsage);
    apiKey.recordUsage(secondUsage);

    expect(apiKey.lastUsedAt).toBe(secondUsage);
  });
});
