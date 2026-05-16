import { createHash } from 'crypto';

import { describe, expect, it, vi } from 'vitest';

import { ApiKey } from '../../domain/entities';
import { ApiKeyInvalidError } from '../../domain/errors';
import { IApiKeyRepository } from '../ports/out';
import { LookupApiKeyUseCase } from './lookup-api-key.use-case';

const apiKeyId = '123e4567-e89b-42d3-a456-426614174000';
const createdById = '223e4567-e89b-42d3-a456-426614174000';
const createdAt = new Date('2026-05-16T00:00:00.000Z');
const now = new Date('2026-05-16T01:00:00.000Z');
const rawKey = 'raw-api-key';
const keyHash = createHash('sha256').update(rawKey).digest('hex');

function createApiKey(): ApiKey {
  return ApiKey.create({
    id: apiKeyId,
    name: 'Publishing API',
    keyHash,
    createdById,
    createdAt,
  });
}

function setup(apiKey: ApiKey | null = createApiKey()) {
  const repository = {
    save: vi.fn<IApiKeyRepository['save']>(),
    findById: vi.fn<IApiKeyRepository['findById']>(),
    findByKeyHash: vi.fn<IApiKeyRepository['findByKeyHash']>().mockResolvedValue(apiKey),
    findAll: vi.fn<IApiKeyRepository['findAll']>(),
    update: vi.fn<IApiKeyRepository['update']>().mockResolvedValue(undefined),
  };
  const clock = { now: vi.fn().mockReturnValue(now) };
  const useCase = new LookupApiKeyUseCase(repository, clock);

  return { repository, useCase };
}

describe('LookupApiKeyUseCase', () => {
  it('returns ApiKey when valid raw key is provided', async () => {
    const apiKey = createApiKey();
    const { useCase } = setup(apiKey);

    await expect(useCase.execute({ rawKey })).resolves.toBe(apiKey);
  });

  it('calls repository.findByKeyHash() with sha256 hash of rawKey', async () => {
    const { repository, useCase } = setup();

    await useCase.execute({ rawKey });

    expect(repository.findByKeyHash).toHaveBeenCalledWith(keyHash);
    expect(repository.findByKeyHash).not.toHaveBeenCalledWith(rawKey);
  });

  it('calls repository.update() to persist lastUsedAt', async () => {
    const apiKey = createApiKey();
    const { repository, useCase } = setup(apiKey);

    await useCase.execute({ rawKey });

    expect(apiKey.lastUsedAt).toBe(now);
    expect(repository.update).toHaveBeenCalledWith(apiKey);
  });

  it('throws ApiKeyInvalidError when findByKeyHash returns null', async () => {
    const { useCase } = setup(null);

    await expect(useCase.execute({ rawKey })).rejects.toThrow(ApiKeyInvalidError);
  });

  it('throws ApiKeyInvalidError when key is revoked', async () => {
    const apiKey = createApiKey();
    apiKey.revoke(now);
    const { useCase } = setup(apiKey);

    await expect(useCase.execute({ rawKey })).rejects.toThrow(ApiKeyInvalidError);
  });
});
