import { describe, expect, it, vi } from 'vitest';

import { ApiKey } from '../../domain/entities';
import { IApiKeyRepository } from '../ports/out';
import { ListApiKeysUseCase } from './list-api-keys.use-case';

const firstId = '123e4567-e89b-42d3-a456-426614174000';
const secondId = '223e4567-e89b-42d3-a456-426614174000';
const createdById = '323e4567-e89b-42d3-a456-426614174000';
const createdAt = new Date('2026-05-16T00:00:00.000Z');

function createApiKey(id = firstId): ApiKey {
  return ApiKey.create({
    id,
    name: 'Publishing API',
    keyHash: `stored-hash-${id}`,
    createdById,
    createdAt,
  });
}

function setup(apiKeys: ApiKey[]) {
  const repository = {
    save: vi.fn<IApiKeyRepository['save']>(),
    findById: vi.fn<IApiKeyRepository['findById']>(),
    findByKeyHash: vi.fn<IApiKeyRepository['findByKeyHash']>(),
    findAll: vi.fn<IApiKeyRepository['findAll']>().mockResolvedValue(apiKeys),
    update: vi.fn<IApiKeyRepository['update']>(),
  };
  const useCase = new ListApiKeysUseCase(repository);

  return { repository, useCase };
}

describe('ListApiKeysUseCase', () => {
  it('returns empty array when no keys exist', async () => {
    const { useCase } = setup([]);

    await expect(useCase.execute()).resolves.toEqual([]);
  });

  it('returns all keys including revoked ones', async () => {
    const active = createApiKey(firstId);
    const revoked = createApiKey(secondId);
    revoked.revoke(new Date('2026-05-16T01:00:00.000Z'));
    const { useCase } = setup([active, revoked]);

    await expect(useCase.execute()).resolves.toEqual([active, revoked]);
  });

  it('calls repository.findAll() once', async () => {
    const { repository, useCase } = setup([]);

    await useCase.execute();

    expect(repository.findAll).toHaveBeenCalledOnce();
  });
});
