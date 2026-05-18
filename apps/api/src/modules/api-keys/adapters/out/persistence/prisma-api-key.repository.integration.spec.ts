import { PrismaClient, Role } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';

import { ApiKey } from '../../../domain/entities';
import { PrismaApiKeyRepository } from './prisma-api-key.repository';

const TEST_USER_ID = '123e4567-e89b-42d3-a456-426614174000';
const API_KEY_ID = '223e4567-e89b-42d3-a456-426614174000';
const SECOND_API_KEY_ID = '323e4567-e89b-42d3-a456-426614174000';
const THIRD_API_KEY_ID = '423e4567-e89b-42d3-a456-426614174000';
const CREATED_AT = new Date('2026-05-16T00:00:00.000Z');

const apiRoot = resolve(__dirname, '../../../../../..');

function createApiKey(overrides: Partial<{
  id: string;
  name: string;
  keyHash: string;
  createdAt: Date;
}> = {}): ApiKey {
  return ApiKey.create({
    id: overrides.id ?? API_KEY_ID,
    name: overrides.name ?? 'Publishing API',
    keyHash: overrides.keyHash ?? 'stored-hash',
    createdById: TEST_USER_ID,
    createdAt: overrides.createdAt ?? CREATED_AT,
  });
}

describe('PrismaApiKeyRepository integration', () => {
  let postgres: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let repository: PrismaApiKeyRepository;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:16-alpine')
      .withStartupTimeout(120000)
      .start();
    const databaseUrl = postgres.getConnectionUri();

    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: apiRoot,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: 'pipe',
    });

    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();
    repository = new PrismaApiKeyRepository(prisma as never);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
    await postgres.stop();
  });

  beforeEach(async () => {
    await prisma.auditEvent.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.contentMediaRef.deleteMany();
    await prisma.contentVersion.deleteMany();
    await prisma.content.deleteMany();
    await prisma.mediaItem.deleteMany();
    await prisma.user.deleteMany({
      where: {
        id: TEST_USER_ID,
      },
    });
    await seedUser();
  });

  it('save() + findById() saves a new ApiKey and retrieves it by id', async () => {
    const apiKey = createApiKey();

    await repository.save(apiKey);
    const found = await repository.findById(API_KEY_ID);

    expect(found?.name.value).toBe('Publishing API');
    expect(found?.keyHash.value).toBe('stored-hash');
    expect(found?.createdById).toBe(TEST_USER_ID);
    expect(found?.isRevoked).toBe(false);
    expect(found?.lastUsedAt).toBeNull();
  });

  it('findByKeyHash() returns the correct ApiKey when searched by keyHash', async () => {
    const apiKey = createApiKey({ keyHash: 'known-hash' });

    await repository.save(apiKey);

    await expect(repository.findByKeyHash('known-hash')).resolves.toMatchObject({
      keyHash: { value: 'known-hash' },
    });
  });

  it('findByKeyHash() returns null for an unknown hash', async () => {
    await expect(repository.findByKeyHash('unknown-hash')).resolves.toBeNull();
  });

  it('findAll() returns empty array when no keys exist', async () => {
    await expect(repository.findAll()).resolves.toEqual([]);
  });

  it('findAll() returns all keys including revoked ones ordered by createdAt descending', async () => {
    const oldest = createApiKey({
      id: API_KEY_ID,
      name: 'Oldest',
      keyHash: 'oldest-hash',
      createdAt: new Date('2026-05-16T00:00:00.000Z'),
    });
    const middle = createApiKey({
      id: SECOND_API_KEY_ID,
      name: 'Middle',
      keyHash: 'middle-hash',
      createdAt: new Date('2026-05-16T01:00:00.000Z'),
    });
    const newest = createApiKey({
      id: THIRD_API_KEY_ID,
      name: 'Newest',
      keyHash: 'newest-hash',
      createdAt: new Date('2026-05-16T02:00:00.000Z'),
    });
    middle.revoke(new Date('2026-05-16T03:00:00.000Z'));

    await repository.save(oldest);
    await repository.save(middle);
    await repository.update(middle);
    await repository.save(newest);

    const results = await repository.findAll();

    expect(results.map((apiKey) => apiKey.id.value)).toEqual([
      THIRD_API_KEY_ID,
      SECOND_API_KEY_ID,
      API_KEY_ID,
    ]);
    expect(results[1]?.isRevoked).toBe(true);
  });

  it('update() persists revokedAt', async () => {
    const apiKey = createApiKey();

    await repository.save(apiKey);
    apiKey.revoke(new Date('2026-05-16T01:00:00.000Z'));
    await repository.update(apiKey);
    const found = await repository.findById(API_KEY_ID);

    expect(found?.isRevoked).toBe(true);
    expect(found?.revokedAt).toBeInstanceOf(Date);
  });

  it('update() persists lastUsedAt', async () => {
    const apiKey = createApiKey();

    await repository.save(apiKey);
    apiKey.recordUsage(new Date('2026-05-16T01:00:00.000Z'));
    await repository.update(apiKey);
    const found = await repository.findById(API_KEY_ID);

    expect(found?.lastUsedAt).toBeInstanceOf(Date);
  });

  async function seedUser(): Promise<void> {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {
        email: 'api-key-tests@example.com',
        name: 'API Key Test Admin',
        passwordHash: 'password-hash',
        role: Role.ADMIN,
      },
      create: {
        id: TEST_USER_ID,
        email: 'api-key-tests@example.com',
        name: 'API Key Test Admin',
        passwordHash: 'password-hash',
        role: Role.ADMIN,
      },
    });
  }
});
