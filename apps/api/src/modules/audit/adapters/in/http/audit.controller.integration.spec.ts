import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../shared/guards/roles.guard';
import { AuditAction, AuditEvent } from '../../../domain';
import { FakeAuditRepository } from '../../../tests/doubles/fake-audit.repository';
import {
  ExportAuditCsvUseCase,
  ListAuditEventsUseCase,
} from '../../../application/use-cases';
import { AuditController } from './audit.controller';

const jwtSecret = 'audit-controller-test-secret';
const adminId = '123e4567-e89b-42d3-a456-426614174000';
const editorId = '223e4567-e89b-42d3-a456-426614174000';

describe('AuditController integration', () => {
  let app: INestApplication;
  let audit: FakeAuditRepository;
  let adminToken: string;
  let editorToken: string;

  beforeAll(async () => {
    audit = new FakeAuditRepository();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: 'JWT_SECRET', useValue: jwtSecret },
        {
          provide: 'LIST_AUDIT_EVENTS_USE_CASE',
          useFactory: () => new ListAuditEventsUseCase(audit),
        },
        {
          provide: 'EXPORT_AUDIT_CSV_USE_CASE',
          useFactory: () => new ExportAuditCsvUseCase(audit),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    adminToken = await tokenFor(adminId, 'ADMIN');
    editorToken = await tokenFor(editorId, 'EDITOR');
  });

  beforeEach(() => {
    audit.events.length = 0;
    seedAuditEvents(audit);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/admin/audit returns 401 without JWT', async () => {
    await httpRequest().get('/api/admin/audit').expect(401);
  });

  it('GET /api/admin/audit returns 403 for non-admin JWT', async () => {
    await httpRequest()
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(403);
  });

  it('GET /api/admin/audit returns paginated filtered audit events for admins', async () => {
    const response = await httpRequest()
      .get('/api/admin/audit')
      .query({
        actorId: adminId,
        action: AuditAction.CONTENT_CREATED,
        targetType: 'content',
        dateFrom: '2026-05-18T00:30:00.000Z',
        dateTo: '2026-05-18T01:30:00.000Z',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual({
      data: [
        {
          id: 'audit-1',
          timestamp: '2026-05-18T01:00:00.000Z',
          actorId: adminId,
          actorIp: '127.0.0.1',
          action: AuditAction.CONTENT_CREATED,
          targetType: 'content',
          targetId: 'content-1',
          summary: { title: 'Hello' },
        },
      ],
      pagination: {
        page: 1,
        page_size: 10,
        total: 1,
        total_pages: 1,
      },
    });
  });

  it('GET /api/admin/audit validates query parameters with Zod', async () => {
    await httpRequest()
      .get('/api/admin/audit')
      .query({ page: 0 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(422);
  });

  it('GET /api/admin/audit/export returns 401 without JWT', async () => {
    await httpRequest().get('/api/admin/audit/export').expect(401);
  });

  it('GET /api/admin/audit/export returns 403 for non-admin JWT', async () => {
    await httpRequest()
      .get('/api/admin/audit/export')
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(403);
  });

  it('GET /api/admin/audit/export returns filtered CSV for admins', async () => {
    const response = await httpRequest()
      .get('/api/admin/audit/export')
      .query({ targetType: 'content' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toBe('attachment; filename="audit.csv"');
    expect(response.text).toContain('id,timestamp,actorId,actorIp,action,targetType,targetId,summary');
    expect(response.text).toContain('audit-1,2026-05-18T01:00:00.000Z');
    expect(response.text).toContain('CONTENT_CREATED');
    expect(response.text).not.toContain('MEDIA_DELETED');
  });

  function httpRequest(): ReturnType<typeof request> {
    return request(app.getHttpServer() as Parameters<typeof request>[0]);
  }
});

async function tokenFor(userId: string, role: string): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(jwtSecret));
}

function seedAuditEvents(audit: FakeAuditRepository): void {
  audit.events.push(
    AuditEvent.rehydrate({
      id: 'audit-1',
      timestamp: new Date('2026-05-18T01:00:00.000Z'),
      actorId: adminId,
      actorIp: '127.0.0.1',
      action: AuditAction.CONTENT_CREATED,
      targetType: 'content',
      targetId: 'content-1',
      summary: { title: 'Hello' },
    }),
    AuditEvent.rehydrate({
      id: 'audit-2',
      timestamp: new Date('2026-05-18T02:00:00.000Z'),
      actorId: editorId,
      actorIp: '127.0.0.2',
      action: AuditAction.MEDIA_DELETED,
      targetType: 'media',
      targetId: 'media-1',
      summary: { filename: 'hero.jpg' },
    }),
  );
}
