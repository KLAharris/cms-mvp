import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { config as loadEnv } from 'dotenv';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import Redis from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../../../src/app.module';
import { ValidationPipe } from '../../../src/shared/http/validation.pipe';
import {
  IMAGE_PROCESSOR,
  OBJECT_STORAGE,
} from '../../../src/modules/media/media-tokens';
import { JOB_ENQUEUER } from '../../../src/shared/ports/job-enqueuer.port';

const apiRoot = resolve(__dirname, '../../..');

const cleanupRedis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});
cleanupRedis.on('error', () => undefined);

const adminEmail = 'media-admin@cms.local';
const adminPassword = 'AdminPassword123!';
const authorEmail = 'media-author@cms.local';
const authorPassword = 'AuthorPassword123!';

describe('MediaController integration', () => {
  let app: INestApplication;
  let postgres: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let adminToken: string;
  let authorToken: string;
  let adminId: string;
  let authorId: string;

  const mockStorage = {
    presignUpload: vi.fn().mockImplementation(
      (params: { storageKey: string; mimeType: string; maxBytes: number; ttlSeconds: number }) => ({
        uploadUrl: 'https://mock-s3.test/upload',
        storageKey: params.storageKey,
        expiresAt: new Date(),
      }),
    ),
    getSignedUrl: vi.fn().mockResolvedValue({
      url: 'https://mock-s3.test/file.jpg',
      expiresAt: new Date(),
    }),
    deleteObject: vi.fn().mockResolvedValue(undefined),
  };

  const mockProcessor = {
    generateVariants: vi.fn().mockResolvedValue({ variants: [] }),
  };

  const mockJobEnqueuer = {
    enqueue: vi.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    loadEnv({ path: resolve(apiRoot, '.env') });

    postgres = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = postgres.getConnectionUri();

    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });

    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OBJECT_STORAGE)
      .useValue(mockStorage)
      .overrideProvider(IMAGE_PROCESSOR)
      .useValue(mockProcessor)
      .overrideProvider(JOB_ENQUEUER)
      .useValue(mockJobEnqueuer)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    await prisma.contentMediaRef.deleteMany();
    await prisma.contentVersion.deleteMany();
    await prisma.content.deleteMany();
    await prisma.mediaItem.deleteMany();
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, authorEmail] } } });

    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Media Admin',
        passwordHash: await argon2.hash(adminPassword),
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminId = adminUser.id;

    const authorUser = await prisma.user.create({
      data: {
        email: authorEmail,
        name: 'Media Author',
        passwordHash: await argon2.hash(authorPassword),
        role: Role.AUTHOR,
        status: UserStatus.ACTIVE,
      },
    });
    authorId = authorUser.id;

    adminToken = await loginAndGetToken(adminEmail, adminPassword);
    authorToken = await loginAndGetToken(authorEmail, authorPassword);
  }, 120000);

  afterAll(async () => {
    await prisma?.contentMediaRef.deleteMany();
    await prisma?.contentVersion.deleteMany();
    await prisma?.content.deleteMany();
    await prisma?.mediaItem.deleteMany();
    await prisma?.auditEvent.deleteMany();
    await prisma?.apiKey.deleteMany();
    await prisma?.user.deleteMany({ where: { email: { in: [adminEmail, authorEmail] } } });
    await app?.close();
    await cleanupRedis.quit();
    await prisma?.$disconnect();
    await postgres?.stop();
  });

  beforeEach(async () => {
    await cleanupRedis.flushdb();
    await prisma.contentMediaRef.deleteMany();
    await prisma.contentVersion.deleteMany();
    await prisma.content.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.mediaItem.deleteMany({
      where: { uploadedBy: { in: [adminId, authorId] } },
    });
  });

  // ── POST /api/admin/media/presign ─────────────────────────────────────────

  describe('POST /api/admin/media/presign', () => {
    it('returns 401 when no JWT provided', async () => {
      await httpRequest()
        .post('/api/admin/media/presign')
        .send({ filename: 'photo.png', mimeType: 'image/png', sizeBytes: 1024 })
        .expect(401);
    });

    it('returns 201 with presign response for valid PNG request', async () => {
      const response = await httpRequest()
        .post('/api/admin/media/presign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ filename: 'photo.png', mimeType: 'image/png', sizeBytes: 1024 })
        .expect(201);

      expect(response.body).toMatchObject({
        mediaId: expect.any(String),
        uploadUrl: 'https://mock-s3.test/upload',
        storageKey: expect.any(String),
        expiresAt: expect.any(String),
      });
    });

    it('returns 422 for disallowed mimeType (text/html)', async () => {
      await httpRequest()
        .post('/api/admin/media/presign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ filename: 'file.html', mimeType: 'text/html', sizeBytes: 1024 })
        .expect(422);
    });

    it('returns 422 for extension mismatch (photo.png with image/jpeg)', async () => {
      await httpRequest()
        .post('/api/admin/media/presign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ filename: 'photo.png', mimeType: 'image/jpeg', sizeBytes: 1024 })
        .expect(422);
    });

    it('returns 422 when sizeBytes exceeds MAX_UPLOAD_BYTES', async () => {
      await httpRequest()
        .post('/api/admin/media/presign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ filename: 'photo.png', mimeType: 'image/png', sizeBytes: 20_971_521 })
        .expect(422);
    });
  });

  // ── POST /api/admin/media ─────────────────────────────────────────────────

  describe('POST /api/admin/media', () => {
    it('returns 401 when no JWT provided', async () => {
      await httpRequest()
        .post('/api/admin/media')
        .send({ mediaId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });

    it('returns 202 for valid pending mediaId', async () => {
      const mediaId = await presignAndGetMediaId(adminToken);

      await httpRequest()
        .post('/api/admin/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ mediaId })
        .expect(202);
    });

    it('returns 404 for unknown mediaId', async () => {
      await httpRequest()
        .post('/api/admin/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ mediaId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('returns 409 when mediaId has already been finalized', async () => {
      // PDF skips the worker and goes directly to ready status
      const mediaId = await presignAndGetMediaId(adminToken, {
        filename: 'doc.pdf',
        mimeType: 'application/pdf',
      });

      await httpRequest()
        .post('/api/admin/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ mediaId })
        .expect(202);

      await httpRequest()
        .post('/api/admin/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ mediaId })
        .expect(409);
    });
  });

  // ── GET /api/admin/media ──────────────────────────────────────────────────

  describe('GET /api/admin/media', () => {
    it('returns 401 when no JWT provided', async () => {
      await httpRequest().get('/api/admin/media').expect(401);
    });

    it('returns 200 with empty list when no media items exist', async () => {
      const response = await httpRequest()
        .get('/api/admin/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({ items: [], total: 0 });
    });

    it('returns 200 with items array after presign', async () => {
      await presignAndGetMediaId(adminToken);

      const response = await httpRequest()
        .get('/api/admin/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as { total: number; items: unknown[] };
      expect(body.total).toBe(1);
      expect(body.items).toHaveLength(1);
      expect(body.items[0]).toMatchObject({
        filename: 'photo.png',
        mimeType: 'image/png',
        status: 'pending',
      });
    });

    it('returns only matching items when search filter is applied', async () => {
      await presignAndGetMediaId(adminToken, { filename: 'photo.png', mimeType: 'image/png' });
      await presignAndGetMediaId(adminToken, {
        filename: 'document.pdf',
        mimeType: 'application/pdf',
      });

      const response = await httpRequest()
        .get('/api/admin/media?search=photo')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const filteredBody = response.body as { total: number; items: Array<{ filename: string }> };
      expect(filteredBody.total).toBe(1);
      expect(filteredBody.items[0]?.filename).toBe('photo.png');
    });
  });

  // ── PATCH /api/admin/media/:id ────────────────────────────────────────────

  describe('PATCH /api/admin/media/:id', () => {
    it('returns 401 when no JWT provided', async () => {
      await httpRequest()
        .patch('/api/admin/media/00000000-0000-0000-0000-000000000000')
        .send({ altText: 'Updated' })
        .expect(401);
    });

    it('returns 200 with updated altText and caption', async () => {
      const mediaId = await presignAndGetMediaId(adminToken);

      const response = await httpRequest()
        .patch(`/api/admin/media/${mediaId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ altText: 'A photo of a cat', caption: 'Cute cat' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: mediaId,
        altText: 'A photo of a cat',
        caption: 'Cute cat',
      });
    });

    it('returns 404 for unknown id', async () => {
      await httpRequest()
        .patch('/api/admin/media/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ altText: 'Updated' })
        .expect(404);
    });
  });

  // ── DELETE /api/admin/media/:id ───────────────────────────────────────────

  describe('DELETE /api/admin/media/:id', () => {
    it('returns 401 when no JWT provided', async () => {
      await httpRequest()
        .delete('/api/admin/media/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('returns 204 when author deletes their own media', async () => {
      const mediaId = await presignAndGetMediaId(authorToken);

      await httpRequest()
        .delete(`/api/admin/media/${mediaId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(204);
    });

    it('returns 404 for unknown id', async () => {
      await httpRequest()
        .delete('/api/admin/media/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 403 when AUTHOR tries to delete another users media', async () => {
      const mediaId = await presignAndGetMediaId(adminToken);

      await httpRequest()
        .delete(`/api/admin/media/${mediaId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(403);
    });
  });

  // ── GET /api/v1/media/:id (public) ────────────────────────────────────────

  describe('GET /api/v1/media/:id', () => {
    it('returns 200 with media item and variants', async () => {
      const mediaId = await presignAndGetMediaId(adminToken);

      const response = await httpRequest()
        .get(`/api/v1/media/${mediaId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: mediaId,
        filename: 'photo.png',
        mimeType: 'image/png',
        status: 'pending',
        variants: {},
      });
    });

    it('returns 404 for unknown id', async () => {
      await httpRequest()
        .get('/api/v1/media/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function presignAndGetMediaId(
    token: string,
    opts: { filename?: string; mimeType?: string } = {},
  ): Promise<string> {
    const filename = opts.filename ?? 'photo.png';
    const mimeType = opts.mimeType ?? 'image/png';

    const response = await httpRequest()
      .post('/api/admin/media/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename, mimeType, sizeBytes: 1024 })
      .expect(201);

    const body = response.body as { mediaId?: unknown };
    if (typeof body.mediaId !== 'string') {
      throw new Error('Expected mediaId in presign response');
    }
    return body.mediaId;
  }

  async function loginAndGetToken(email: string, password: string): Promise<string> {
    const response = await httpRequest()
      .post('/api/admin/auth/login')
      .send({ email, password })
      .expect(200);

    const body = response.body as { accessToken?: unknown };
    if (typeof body.accessToken !== 'string') {
      throw new Error('Expected accessToken in login response');
    }
    return body.accessToken;
  }

  function httpRequest(): ReturnType<typeof request> {
    return request(app.getHttpServer() as Parameters<typeof request>[0]);
  }
});
