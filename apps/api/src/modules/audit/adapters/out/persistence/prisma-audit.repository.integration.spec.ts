import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AuditAction, AuditEvent } from '../../../domain';
import { PrismaAuditRepository } from './prisma-audit.repository';

const apiRoot = resolve(__dirname, '../../../../../..');
const actorId = '123e4567-e89b-42d3-a456-426614174000';
const firstEventId = '223e4567-e89b-42d3-a456-426614174000';
const secondEventId = '323e4567-e89b-42d3-a456-426614174000';
const thirdEventId = '423e4567-e89b-42d3-a456-426614174000';

describe('PrismaAuditRepository integration', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let repository: PrismaAuditRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = container.getConnectionUri();

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
    repository = new PrismaAuditRepository(prisma as never);
  }, 120000);

  beforeEach(async () => {
    await prisma.auditEvent.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: {
        id: actorId,
        email: 'audit-repository-admin@cms.local',
        name: 'Audit Repository Admin',
        passwordHash: 'hash',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  it('save() inserts an audit event and findMany() rehydrates it', async () => {
    await repository.save(
      auditEvent({
        id: firstEventId,
        action: AuditAction.CONTENT_CREATED,
        targetType: 'content',
        targetId: 'content-1',
        timestamp: new Date('2026-05-18T01:00:00.000Z'),
        summary: { title: 'Hello' },
      }),
    );

    const result = await repository.findMany({}, { page: 1, pageSize: 10 });

    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(result.data[0]).toMatchObject({
      id: firstEventId,
      actorId,
      actorIp: '127.0.0.1',
      action: AuditAction.CONTENT_CREATED,
      targetType: 'content',
      targetId: 'content-1',
      summary: { title: 'Hello' },
    });
    expect(result.data[0]?.timestamp.toISOString()).toBe('2026-05-18T01:00:00.000Z');
  });

  it('findMany() filters by actor, action, target type, date range, and paginates', async () => {
    await repository.save(
      auditEvent({
        id: firstEventId,
        action: AuditAction.CONTENT_CREATED,
        targetType: 'content',
        targetId: 'content-1',
        timestamp: new Date('2026-05-18T01:00:00.000Z'),
      }),
    );
    await repository.save(
      auditEvent({
        id: secondEventId,
        action: AuditAction.CONTENT_UPDATED,
        targetType: 'content',
        targetId: 'content-2',
        timestamp: new Date('2026-05-18T02:00:00.000Z'),
      }),
    );
    await repository.save(
      auditEvent({
        id: thirdEventId,
        actorId: null,
        action: AuditAction.MEDIA_DELETED,
        targetType: 'media',
        targetId: 'media-1',
        timestamp: new Date('2026-05-18T03:00:00.000Z'),
      }),
    );

    await expect(
      repository.findMany(
        {
          actorId,
          action: AuditAction.CONTENT_UPDATED,
          targetType: 'content',
          dateFrom: new Date('2026-05-18T01:30:00.000Z'),
          dateTo: new Date('2026-05-18T02:30:00.000Z'),
        },
        { page: 1, pageSize: 10 },
      ),
    ).resolves.toMatchObject({
      data: [{ id: secondEventId }],
      pagination: { total: 1, totalPages: 1 },
    });

    const paged = await repository.findMany({}, { page: 2, pageSize: 1 });

    expect(paged.data.map((event) => event.id)).toEqual([secondEventId]);
    expect(paged.pagination).toEqual({
      page: 2,
      pageSize: 1,
      total: 3,
      totalPages: 3,
    });
  });

  it('findMany() caps oversized page sizes', async () => {
    await repository.save(
      auditEvent({
        id: firstEventId,
        action: AuditAction.USER_LOGIN,
        targetType: 'user',
        targetId: actorId,
        timestamp: new Date('2026-05-18T01:00:00.000Z'),
      }),
    );

    const result = await repository.findMany({}, { page: 0, pageSize: 5000 });

    expect(result.pagination.page).toBe(1);
    expect(result.pagination.pageSize).toBe(1000);
  });
});

function auditEvent(overrides: Partial<{
  id: string;
  actorId: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  timestamp: Date;
  summary: Record<string, unknown>;
}>): AuditEvent {
  return AuditEvent.create({
    id: overrides.id,
    actorId: overrides.actorId ?? actorId,
    actorIp: '127.0.0.1',
    action: overrides.action ?? AuditAction.USER_LOGIN,
    targetType: overrides.targetType ?? 'user',
    targetId: overrides.targetId ?? actorId,
    summary: overrides.summary ?? { result: 'ok' },
    timestamp: overrides.timestamp ?? new Date('2026-05-18T00:00:00.000Z'),
  });
}
