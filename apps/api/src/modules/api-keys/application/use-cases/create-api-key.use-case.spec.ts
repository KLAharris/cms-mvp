import { describe, expect, it, vi } from 'vitest';

import { ApiKeyCreatedEvent } from '../../domain/events';
import { IApiKeyRepository } from '../ports/out';
import { CreateApiKeyUseCase } from './create-api-key.use-case';

const generatedId = '123e4567-e89b-42d3-a456-426614174000';
const createdById = '223e4567-e89b-42d3-a456-426614174000';
const now = new Date('2026-05-16T00:00:00.000Z');

function setup() {
  const repository = {
    save: vi.fn<IApiKeyRepository['save']>().mockResolvedValue(undefined),
    findById: vi.fn<IApiKeyRepository['findById']>(),
    findByKeyHash: vi.fn<IApiKeyRepository['findByKeyHash']>(),
    findAll: vi.fn<IApiKeyRepository['findAll']>(),
    update: vi.fn<IApiKeyRepository['update']>(),
  };
  const ids = { generate: vi.fn().mockReturnValue(generatedId) };
  const clock = { now: vi.fn().mockReturnValue(now) };
  const events = { publishAll: vi.fn().mockResolvedValue(undefined) };
  const useCase = new CreateApiKeyUseCase(repository, ids, clock, events);

  return { events, repository, useCase };
}

describe('CreateApiKeyUseCase', () => {
  it('returns apiKey and rawKey on success', async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ name: 'Publishing API', createdById });

    expect(result.apiKey.id.value).toBe(generatedId);
    expect(result.apiKey.name.value).toBe('Publishing API');
    expect(result.rawKey).toEqual(expect.any(String));
  });

  it('returns a 64-character hex rawKey', async () => {
    const { useCase } = setup();

    const { rawKey } = await useCase.execute({ name: 'Publishing API', createdById });

    expect(rawKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('does not store the rawKey in the repository', async () => {
    const { repository, useCase } = setup();

    const { rawKey } = await useCase.execute({ name: 'Publishing API', createdById });
    const savedApiKey = repository.save.mock.calls[0]?.[0];

    expect(savedApiKey?.keyHash.value).not.toBe(rawKey);
  });

  it('calls repository.save() once', async () => {
    const { repository, useCase } = setup();

    await useCase.execute({ name: 'Publishing API', createdById });

    expect(repository.save).toHaveBeenCalledOnce();
  });

  it('publishes ApiKeyCreatedEvent once', async () => {
    const { events, useCase } = setup();

    await useCase.execute({ name: 'Publishing API', createdById });

    expect(events.publishAll).toHaveBeenCalledOnce();
    expect(events.publishAll).toHaveBeenCalledWith([
      expect.any(ApiKeyCreatedEvent),
    ]);
  });

  it('creates an ApiKey that is not revoked', async () => {
    const { useCase } = setup();

    const { apiKey } = await useCase.execute({ name: 'Publishing API', createdById });

    expect(apiKey.isRevoked).toBe(false);
  });
});
