import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import Redis from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { config as loadEnv } from 'dotenv';

import { AppModule } from '../../../../../app.module';
import { ValidationPipe } from '../../../../../shared/http/validation.pipe';

const apiRoot = resolve(__dirname, '../../../../../..');

const adminId = '123e4567-e89b-42d3-a456-426614174000';
const editorId = '223e4567-e89b-42d3-a456-426614174000';
const apiKeyId = '323e4567-e89b-42d3-a456-426614174000';
const unknownApiKeyId = '423e4567-e89b-42d3-a456-426614174000';
const adminEmail = 'api-key-admin@cms.local';
const adminPassword = 'adminpassword123';
const editorEmail = 'api-key-editor@cms.local';
const editorPassword = 'editorpassword123';

describe('ApiKeys admin integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let cleanupRedis: Redis;
  let adminToken: string;
  let editorToken: string;

  beforeAll(async () => {
    loadEnv({ path: resolve(apiRoot, '.env') });

    const testDatabaseUrl = process.env.TEST_DATABASE_URL;

    if (!testDatabaseUrl) {
      throw new Error('TEST_DATABASE_URL is required for api key integration tests');
    }

    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
    cleanupRedis = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    cleanupRedis.on('error', () => undefined);
    await cleanupRedis.connect();

    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: apiRoot,
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
      stdio: 'pipe',
    });

    prisma = new PrismaClient();
    await cleanupRedis.flushdb();
    await prisma.apiKey.deleteMany();
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: { in: [adminId, editorId] } },
          { email: { in: [adminEmail, editorEmail] } },
        ],
      },
    });
    await seedUser({
      id: adminId,
      email: adminEmail,
      name: 'API Key Admin',
      password: adminPassword,
      role: Role.ADMIN,
    });
    await seedUser({
      id: editorId,
      email: editorEmail,
      name: 'API Key Editor',
      password: editorPassword,
      role: Role.EDITOR,
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    adminToken = await loginAndReadAccessToken(adminEmail, adminPassword);
    editorToken = await loginAndReadAccessToken(editorEmail, editorPassword);
  });

  beforeEach(async () => {
    await cleanupRedis.flushdb();
    await prisma.apiKey.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    cleanupRedis.disconnect();
    await prisma.$disconnect();
  });

  it('GET /api/admin/api-keys: No JWT returns 401', async () => {
    await httpRequest().get('/api/admin/api-keys').expect(401);
  });

  it('GET /api/admin/api-keys: Editor JWT returns 403', async () => {
    await httpRequest()
      .get('/api/admin/api-keys')
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(403);
  });

  it('GET /api/admin/api-keys: Admin JWT with empty list returns 200 with []', async () => {
    const response = await httpRequest()
      .get('/api/admin/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('GET /api/admin/api-keys: Admin JWT with one key returns that key without rawKey', async () => {
    await seedApiKey();

    const response = await httpRequest()
      .get('/api/admin/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual([
      {
        id: apiKeyId,
        name: 'Seeded Key',
        lastUsedAt: null,
        revokedAt: null,
        createdById: adminId,
        createdAt: '2026-05-16T00:00:00.000Z',
      },
    ]);
  });

  it('GET /api/admin/api-keys: Response shape has ApiKeyResponse fields only', async () => {
    await seedApiKey();

    const response = await httpRequest()
      .get('/api/admin/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const [item] = response.body as Array<Record<string, unknown>>;

    expect(Object.keys(item ?? {}).sort()).toEqual([
      'createdAt',
      'createdById',
      'id',
      'lastUsedAt',
      'name',
      'revokedAt',
    ]);
  });

  it('POST /api/admin/api-keys: No JWT returns 401', async () => {
    await httpRequest()
      .post('/api/admin/api-keys')
      .send({ name: 'Test Key' })
      .expect(401);
  });

  it('POST /api/admin/api-keys: Editor JWT returns 403', async () => {
    await httpRequest()
      .post('/api/admin/api-keys')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ name: 'Test Key' })
      .expect(403);
  });

  it('POST /api/admin/api-keys: Admin JWT with valid body returns 201 with rawKey', async () => {
    const response = await httpRequest()
      .post('/api/admin/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Key' })
      .expect(201);
    const body = response.body as Record<string, unknown>;

    expect(body.rawKey).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/));
    const expectedBody: Record<string, unknown> = {
      id: expect.any(String) as string,
      name: 'Test Key',
      createdById: adminId,
      createdAt: expect.any(String) as string,
    };
    expect(body).toMatchObject(expectedBody);
  });

  it('POST /api/admin/api-keys: rawKey is not present in subsequent GET response', async () => {
    await httpRequest()
      .post('/api/admin/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Key' })
      .expect(201);

    const response = await httpRequest()
      .get('/api/admin/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const [item] = response.body as Array<Record<string, unknown>>;

    expect(item).not.toHaveProperty('rawKey');
  });

  it('POST /api/admin/api-keys: Empty name returns 422', async () => {
    await httpRequest()
      .post('/api/admin/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '' })
      .expect(422);
  });

  it('POST /api/admin/api-keys: Name exceeding 100 chars returns 422', async () => {
    await httpRequest()
      .post('/api/admin/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'a'.repeat(101) })
      .expect(422);
  });

  it('DELETE /api/admin/api-keys/:id: No JWT returns 401', async () => {
    await httpRequest().delete(`/api/admin/api-keys/${apiKeyId}`).expect(401);
  });

  it('DELETE /api/admin/api-keys/:id: Editor JWT returns 403', async () => {
    await httpRequest()
      .delete(`/api/admin/api-keys/${apiKeyId}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(403);
  });

  it('DELETE /api/admin/api-keys/:id: Admin JWT with valid id returns 204', async () => {
    await seedApiKey();

    await httpRequest()
      .delete(`/api/admin/api-keys/${apiKeyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('DELETE /api/admin/api-keys/:id: Admin JWT with unknown id returns 404', async () => {
    await httpRequest()
      .delete(`/api/admin/api-keys/${unknownApiKeyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /api/admin/api-keys/:id: Admin JWT with already revoked id returns 409', async () => {
    await seedApiKey({ revokedAt: new Date('2026-05-16T01:00:00.000Z') });

    await httpRequest()
      .delete(`/api/admin/api-keys/${apiKeyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('DELETE /api/admin/api-keys/:id: After revoke GET list shows revokedAt is set', async () => {
    await seedApiKey();

    await httpRequest()
      .delete(`/api/admin/api-keys/${apiKeyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const response = await httpRequest()
      .get('/api/admin/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const [item] = response.body as Array<{ revokedAt?: unknown }>;

    expect(item?.revokedAt).toEqual(expect.any(String));
  });

  async function seedUser(params: {
    id: string;
    email: string;
    name: string;
    password: string;
    role: Role;
  }) {
    return prisma.user.create({
      data: {
        id: params.id,
        email: params.email,
        name: params.name,
        passwordHash: await argon2.hash(params.password),
        role: params.role,
        status: UserStatus.ACTIVE,
      },
    });
  }

  async function seedApiKey(overrides: Partial<{
    revokedAt: Date | null;
  }> = {}) {
    return prisma.apiKey.create({
      data: {
        id: apiKeyId,
        name: 'Seeded Key',
        keyHash: 'seeded-key-hash',
        revokedAt: overrides.revokedAt,
        createdById: adminId,
        createdAt: new Date('2026-05-16T00:00:00.000Z'),
      },
    });
  }

  async function loginAndReadAccessToken(email: string, password: string): Promise<string> {
    const response = await httpRequest()
      .post('/api/admin/auth/login')
      .send({ email, password })
      .expect(200);
    const body = response.body as { accessToken?: unknown };

    if (typeof body.accessToken !== 'string') {
      throw new Error('Expected accessToken to be returned');
    }

    return body.accessToken;
  }

  function httpRequest(): ReturnType<typeof request> {
    return request(app.getHttpServer() as Parameters<typeof request>[0]);
  }
});
