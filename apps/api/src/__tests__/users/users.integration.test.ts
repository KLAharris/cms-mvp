import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import Redis from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { config as loadEnv } from 'dotenv';

import { AppModule } from '../../app.module';
import { ValidationPipe } from '../../shared/http/validation.pipe';

const apiRoot = resolve(__dirname, '../../..');

const cleanupRedis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});
cleanupRedis.on('error', () => undefined);

const adminEmail = 'admin@cms.local';
const adminPassword = 'adminpassword123';
const editorEmail = 'editor@cms.local';
const editorPassword = 'editorpassword123';

describe('User management integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    loadEnv({ path: resolve(apiRoot, '.env') });

    const testDatabaseUrl = process.env.TEST_DATABASE_URL;

    if (!testDatabaseUrl) {
      throw new Error('TEST_DATABASE_URL is required for users integration tests');
    }

    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
    process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';

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
    await seedUser({
      email: adminEmail,
      name: 'Test Admin',
      password: adminPassword,
      role: Role.ADMIN,
    });
  });

  afterAll(async () => {
    await app.close();
    await cleanupRedis.quit();
    await prisma.$disconnect();
  });

  it('GET /api/admin/users: Admin returns 200 with standard list envelope', async () => {
    const token = await loginAndReadAccessToken(adminEmail, adminPassword);

    const response = await httpRequest()
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      data: [
        {
          email: adminEmail,
          name: 'Test Admin',
          role: Role.ADMIN,
          status: 'active',
        },
      ],
      pagination: {
        page: 1,
        page_size: 20,
        total: 1,
        total_pages: 1,
      },
    });
  });

  it('GET /api/admin/users: No JWT returns 401', async () => {
    await httpRequest().get('/api/admin/users').expect(401);
  });

  it('GET /api/admin/users: Editor JWT returns 403', async () => {
    await seedUser({
      email: editorEmail,
      name: 'Test Editor',
      password: editorPassword,
      role: Role.EDITOR,
    });
    const token = await loginAndReadAccessToken(editorEmail, editorPassword);

    await httpRequest()
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('POST /api/admin/users: Admin invites valid user returns 201', async () => {
    const token = await loginAndReadAccessToken(adminEmail, adminPassword);

    await httpRequest()
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'invitee@cms.local', name: 'Invitee User', role: Role.AUTHOR })
      .expect(201);

    await expect(prisma.user.findUnique({ where: { email: 'invitee@cms.local' } }))
      .resolves.toMatchObject({
        name: 'Invitee User',
        role: Role.AUTHOR,
        status: UserStatus.INVITED,
      });
  });

  it('POST /api/admin/users: Admin invites duplicate email returns 409', async () => {
    const token = await loginAndReadAccessToken(adminEmail, adminPassword);

    await httpRequest()
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: adminEmail, name: 'Duplicate User', role: Role.AUTHOR })
      .expect(409);
  });

  it('POST /api/admin/users: No JWT returns 401', async () => {
    await httpRequest()
      .post('/api/admin/users')
      .send({ email: 'invitee@cms.local', name: 'Invitee User', role: Role.AUTHOR })
      .expect(401);
  });

  it('POST /api/admin/users: Invalid email format returns 422', async () => {
    const token = await loginAndReadAccessToken(adminEmail, adminPassword);

    await httpRequest()
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not-an-email', name: 'Invitee User', role: Role.AUTHOR })
      .expect(422);
  });

  it('PATCH /api/admin/users/:id: Admin updates name returns 200 with updated UserDto', async () => {
    const token = await loginAndReadAccessToken(adminEmail, adminPassword);
    const target = await seedUser({
      email: 'author@cms.local',
      name: 'Old Name',
      password: 'authorpassword123',
      role: Role.AUTHOR,
    });

    const response = await httpRequest()
      .patch(`/api/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' })
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        id: target.id,
        name: 'New Name',
        email: 'author@cms.local',
      },
    });
  });

  it('PATCH /api/admin/users/:id: Admin changes last admin role returns 409', async () => {
    const token = await loginAndReadAccessToken(adminEmail, adminPassword);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });

    await httpRequest()
      .patch(`/api/admin/users/${admin.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: Role.EDITOR })
      .expect(409);
  });

  it('PATCH /api/admin/users/:id: Target not found returns 404', async () => {
    const token = await loginAndReadAccessToken(adminEmail, adminPassword);

    await httpRequest()
      .patch('/api/admin/users/missing-user')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' })
      .expect(404);
  });

  it('PATCH /api/admin/users/:id: No JWT returns 401', async () => {
    await httpRequest()
      .patch('/api/admin/users/missing-user')
      .send({ name: 'New Name' })
      .expect(401);
  });

  it('POST /api/admin/users/:id/deactivate: Admin deactivates active user returns 204', async () => {
    const token = await loginAndReadAccessToken(adminEmail, adminPassword);
    const target = await seedUser({
      email: 'author@cms.local',
      name: 'Author User',
      password: 'authorpassword123',
      role: Role.AUTHOR,
    });

    await httpRequest()
      .post(`/api/admin/users/${target.id}/deactivate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await expect(prisma.user.findUnique({ where: { id: target.id } })).resolves.toMatchObject({
      status: UserStatus.DEACTIVATED,
    });
  });

  it('POST /api/admin/users/:id/deactivate: Admin deactivates last admin returns 409', async () => {
    const token = await loginAndReadAccessToken(adminEmail, adminPassword);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });

    await httpRequest()
      .post(`/api/admin/users/${admin.id}/deactivate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('POST /api/admin/users/:id/deactivate: No JWT returns 401', async () => {
    await httpRequest().post('/api/admin/users/missing-user/deactivate').expect(401);
  });

  it('POST /api/admin/auth/accept-invite: Valid token and strong password returns 204', async () => {
    const token = 'invite-token-1';
    await seedInvitedUser(token, new Date(Date.now() + 60_000));

    await httpRequest()
      .post('/api/admin/auth/accept-invite')
      .send({ token, password: 'strongpassword123' })
      .expect(204);

    await expect(prisma.user.findUnique({ where: { email: 'invitee@cms.local' } }))
      .resolves.toMatchObject({
        status: UserStatus.ACTIVE,
        inviteTokenHash: null,
        inviteExpiresAt: null,
      });
  });

  it('POST /api/admin/auth/accept-invite: Expired token returns 410', async () => {
    const token = 'expired-token-1';
    await seedInvitedUser(token, new Date(Date.now() - 60_000));

    await httpRequest()
      .post('/api/admin/auth/accept-invite')
      .send({ token, password: 'strongpassword123' })
      .expect(410);
  });

  it('POST /api/admin/auth/accept-invite: Unknown token returns 404', async () => {
    await httpRequest()
      .post('/api/admin/auth/accept-invite')
      .send({ token: 'unknown-token', password: 'strongpassword123' })
      .expect(404);
  });

  it('POST /api/admin/auth/accept-invite: Weak password returns 422', async () => {
    const token = 'weak-password-token-1';
    await seedInvitedUser(token, new Date(Date.now() + 60_000));

    await httpRequest()
      .post('/api/admin/auth/accept-invite')
      .send({ token, password: 'weak' })
      .expect(422);
  });

  async function seedUser(params: {
    email: string;
    name: string;
    password: string;
    role: Role;
  }) {
    return prisma.user.create({
      data: {
        email: params.email,
        name: params.name,
        passwordHash: await argon2.hash(params.password),
        role: params.role,
        status: UserStatus.ACTIVE,
      },
    });
  }

  async function seedInvitedUser(token: string, inviteExpiresAt: Date) {
    return prisma.user.create({
      data: {
        email: 'invitee@cms.local',
        name: 'Invitee User',
        passwordHash: '',
        role: Role.AUTHOR,
        status: UserStatus.INVITED,
        inviteTokenHash: createHash('sha256').update(token).digest('hex'),
        inviteExpiresAt,
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
