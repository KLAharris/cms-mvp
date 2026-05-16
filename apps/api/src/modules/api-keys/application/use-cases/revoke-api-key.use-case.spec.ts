import { describe, expect, it, vi } from 'vitest';

import { ApiKey } from '../../domain/entities';
import { ApiKeyRevokedEvent } from '../../domain/events';
import {
  ApiKeyAlreadyRevokedError,
  ApiKeyNotFoundError,
} from '../../domain/errors';
import { IApiKeyRepository } from '../ports/out';
import { RevokeApiKeyUseCase } from './revoke-api-key.use-case';

const apiKeyId = '123e4567-e89b-42d3-a456-426614174000';
const createdById = '223e4567-e89b-42d3-a456-426614174000';
const revokedById = '323e4567-e89b-42d3-a456-426614174000';
const createdAt = new Date('2026-05-16T00:00:00.000Z');
const now = new Date('2026-05-16T01:00:00.000Z');

function createApiKey(): ApiKey {
  return ApiKey.create({
    id: apiKeyId,
    name: 'Publishing API',
    keyHash: 'stored-hash',
    createdById,
    createdAt,
  });
}

function setup(apiKey: ApiKey | null = createApiKey()) {
  const repository = {
    save: vi.fn<IApiKeyRepository['save']>(),
    findById: vi.fn<IApiKeyRepository['findById']>().mockResolvedValue(apiKey),
    findByKeyHash: vi.fn<IApiKeyRepository['findByKeyHash']>(),
    findAll: vi.fn<IApiKeyRepository['findAll']>(),
    update: vi.fn<IApiKeyRepository['update']>().mockResolvedValue(undefined),
  };
  const clock = { now: vi.fn().mockReturnValue(now) };
  const events = { publishAll: vi.fn().mockResolvedValue(undefined) };
  const useCase = new RevokeApiKeyUseCase(repository, clock, events);

  return { events, repository, useCase };
}

describe('RevokeApiKeyUseCase', () => {
  it('calls repository.update() with revoked entity on success', async () => {
    const apiKey = createApiKey();
    const { repository, useCase } = setup(apiKey);

    await useCase.execute({ id: apiKeyId, revokedById });

    expect(repository.update).toHaveBeenCalledWith(apiKey);
    expect(apiKey.revokedAt).toBe(now);
  });

  it('throws ApiKeyNotFoundError when findById returns null', async () => {
    const { useCase } = setup(null);

    await expect(useCase.execute({ id: apiKeyId, revokedById })).rejects.toThrow(
      ApiKeyNotFoundError,
    );
  });

  it('throws ApiKeyAlreadyRevokedError when key is already revoked', async () => {
    const apiKey = createApiKey();
    apiKey.revoke(now);
    const { useCase } = setup(apiKey);

    await expect(useCase.execute({ id: apiKeyId, revokedById })).rejects.toThrow(
      ApiKeyAlreadyRevokedError,
    );
  });

  it('publishes ApiKeyRevokedEvent on success', async () => {
    const { events, useCase } = setup();

    await useCase.execute({ id: apiKeyId, revokedById });

    expect(events.publishAll).toHaveBeenCalledWith([
      expect.any(ApiKeyRevokedEvent),
    ]);
  });
});
