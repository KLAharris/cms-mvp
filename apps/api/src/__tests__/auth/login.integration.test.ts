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
const validLoginResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.nativeEnum(Role),
  }),
});

describe('POST /api/admin/auth/login', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let redis: Redis;

  beforeAll(async () => {
    loadEnv({ path: resolve(apiRoot, '.env') });

    const testDatabaseUrl = process.env.TEST_DATABASE_URL;

    if (!testDatabaseUrl) {
      throw new Error('TEST_DATABASE_URL is required for login integration tests');
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
    redis = createRedisClient(process.env.REDIS_URL);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  beforeEach(async () => {
    await redis.flushdb();
    await prisma.user.deleteMany();
    await seedAuthor();
  });

  afterAll(async () => {
    redis.disconnect();
    app.get<Redis>('REDIS_CLIENT').disconnect();
    await app.close();
    await prisma.$disconnect();
  });

  it('returns an access token and sets a refresh token cookie for valid credentials', async () => {
    const response = await httpRequest()
      .post('/api/admin/auth/login')
      .send({ email: 'author@cms.local', password: 'password123' })
      .expect(200);
    const body = validLoginResponseSchema.parse(response.body as unknown);

    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.user.id).toBe('string');
    expect(body.user.email).toBe('author@cms.local');
    expect(body.user.role).toBe(Role.AUTHOR);
    expect(readSetCookieHeader(response)).toContain('refreshToken=');
  });

  it('returns 401 for a wrong password', async () => {
    await httpRequest()
      .post('/api/admin/auth/login')
      .send({ email: 'author@cms.local', password: 'wrong-password' })
      .expect(401);
  });

  it('returns 401 for an unknown email', async () => {
    await httpRequest()
      .post('/api/admin/auth/login')
      .send({ email: 'missing@cms.local', password: 'password123' })
      .expect(401);
  });

  it('returns 400 for a malformed email', async () => {
    await httpRequest()
      .post('/api/admin/auth/login')
      .send({ email: 'not-an-email', password: 'password123' })
      .expect(400);
  });

  it('returns 401 after five consecutive wrong passwords for the same account', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await httpRequest()
        .post('/api/admin/auth/login')
        .send({ email: 'author@cms.local', password: 'wrong-password' })
        .expect(401);
    }

    await httpRequest()
      .post('/api/admin/auth/login')
      .send({ email: 'author@cms.local', password: 'wrong-password' })
      .expect(401);
  });

  it('returns 429 after ten login attempts within sixty seconds from the same IP', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await httpRequest()
        .post('/api/admin/auth/login')
        .set('x-forwarded-for', '198.51.100.10')
        .send({ email: 'missing@cms.local', password: 'password123' })
        .expect(401);
    }

    await httpRequest()
      .post('/api/admin/auth/login')
      .set('x-forwarded-for', '198.51.100.10')
      .send({ email: 'missing@cms.local', password: 'password123' })
      .expect(429);
  });

  async function seedAuthor(): Promise<void> {
    await prisma.user.create({
      data: {
        email: 'author@cms.local',
        name: 'Test Author',
        passwordHash: await argon2.hash('password123'),
        role: Role.AUTHOR,
      },
    });
  }

  function httpRequest(): ReturnType<typeof request> {
    return request(app.getHttpServer() as Parameters<typeof request>[0]);
  }
});

function readSetCookieHeader(response: request.Response): string {
  const setCookie = response.headers['set-cookie'];

  if (Array.isArray(setCookie)) {
    return setCookie.join('; ');
  }

  return setCookie ?? '';
}

function createRedisClient(url: string): Redis {
  const redis = new Redis(url, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  redis.on('error', () => undefined);

  return redis;
}
