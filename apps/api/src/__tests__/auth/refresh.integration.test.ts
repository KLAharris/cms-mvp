import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaClient, Role } from '@prisma/client';
import Redis from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

import { AppModule } from '../../app.module';
import { ValidationPipe } from '../../shared/http/validation.pipe';

const apiRoot = resolve(__dirname, '../../..');

const cleanupRedis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});
cleanupRedis.on('error', () => undefined);

const refreshResponseSchema = z.object({
  accessToken: z.string(),
});

describe('POST /api/admin/auth/refresh', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    loadEnv({ path: resolve(apiRoot, '.env') });

    const testDatabaseUrl = process.env.TEST_DATABASE_URL;

    if (!testDatabaseUrl) {
      throw new Error('TEST_DATABASE_URL is required for refresh integration tests');
    }

    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: apiRoot,
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
      stdio: 'pipe',
    });

    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  beforeEach(async () => {
    await cleanupRedis.flushdb();
    await prisma.contentMediaRef.deleteMany();
    await prisma.contentVersion.deleteMany();
    await prisma.content.deleteMany();
    await prisma.mediaItem.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.user.deleteMany();
    await seedAuthor(prisma);
  });

  afterAll(async () => {
    await app.close();
    await cleanupRedis.quit();
    await prisma.$disconnect();
  });

  it('returns a new access token when the refresh cookie is valid', async () => {
    const cookie = await loginAndReadRefreshCookie(app);

    const response = await httpRequest(app)
      .post('/api/admin/auth/refresh')
      .set('Cookie', cookie)
      .expect(200);

    const body = refreshResponseSchema.parse(response.body as unknown);
    expect(body.accessToken).toEqual(expect.any(String));
  });

  it('returns 401 when the refresh cookie is missing', async () => {
    await httpRequest(app).post('/api/admin/auth/refresh').expect(401);
  });

  it('returns 401 when the refresh token is invalid', async () => {
    await httpRequest(app)
      .post('/api/admin/auth/refresh')
      .set('Cookie', 'refreshToken=invalid-token')
      .expect(401);
  });

  it('returns 401 when the refresh token has been revoked by logout', async () => {
    const cookie = await loginAndReadRefreshCookie(app);

    await httpRequest(app).post('/api/admin/auth/logout').set('Cookie', cookie).expect(204);

    await httpRequest(app).post('/api/admin/auth/refresh').set('Cookie', cookie).expect(401);
  });
});

async function seedAuthor(prisma: PrismaClient): Promise<void> {
  await prisma.user.create({
    data: {
      email: 'author@cms.local',
      name: 'Test Author',
      passwordHash: await argon2.hash('password123'),
      role: Role.AUTHOR,
    },
  });
}

async function loginAndReadRefreshCookie(app: INestApplication): Promise<string> {
  const response = await httpRequest(app)
    .post('/api/admin/auth/login')
    .send({ email: 'author@cms.local', password: 'password123' })
    .expect(200);

  return readRefreshCookie(response);
}

function httpRequest(app: INestApplication): ReturnType<typeof request> {
  return request(app.getHttpServer() as Parameters<typeof request>[0]);
}

function readRefreshCookie(response: request.Response): string {
  const setCookie = response.headers['set-cookie'] as unknown;
  const cookies =
    Array.isArray(setCookie) && setCookie.every((cookie) => typeof cookie === 'string')
      ? setCookie
      : [];
  const refreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));

  if (!refreshCookie) {
    throw new Error('Expected refreshToken cookie to be set');
  }

  return refreshCookie.split(';')[0] ?? refreshCookie;
}
