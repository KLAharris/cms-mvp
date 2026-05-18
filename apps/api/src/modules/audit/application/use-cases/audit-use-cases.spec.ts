import { describe, expect, it } from 'vitest';

import { AuditAction, AuditEvent } from '../../domain';
import { FakeAuditRepository } from '../../tests/doubles/fake-audit.repository';
import { ExportAuditCsvUseCase } from './export-audit-csv.use-case';
import { AuditForbiddenError, ListAuditEventsUseCase } from './list-audit-events.use-case';
import { WriteAuditEventUseCase } from './write-audit-event.use-case';

describe('audit use cases', () => {
  it('writes an audit event', async () => {
    const audit = new FakeAuditRepository();
    const useCase = new WriteAuditEventUseCase(audit);
    const occurredAt = new Date('2026-05-18T00:00:00.000Z');

    await useCase.execute({
      actorId: 'user-1',
      actorIp: '127.0.0.1',
      action: AuditAction.USER_LOGIN,
      targetType: 'user',
      targetId: 'user-1',
      summary: { result: 'success' },
      occurredAt,
    });

    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]?.timestamp).toBe(occurredAt);
    expect(audit.events[0]?.action).toBe(AuditAction.USER_LOGIN);
  });

  it('lists filtered audit events for admins', async () => {
    const audit = new FakeAuditRepository();
    await audit.save(event('a', AuditAction.CONTENT_CREATED, 'user-1'));
    await audit.save(event('b', AuditAction.MEDIA_DELETED, 'user-2'));
    const useCase = new ListAuditEventsUseCase(audit);

    const result = await useCase.execute({
      actorRole: 'ADMIN',
      action: AuditAction.CONTENT_CREATED,
      page: 1,
      pageSize: 10,
    });

    expect(result.data.map((item) => item.id)).toEqual(['a']);
    expect(result.pagination.total).toBe(1);
  });

  it('rejects listing for non-admins', async () => {
    const useCase = new ListAuditEventsUseCase(new FakeAuditRepository());

    await expect(useCase.execute({ actorRole: 'EDITOR' })).rejects.toThrow(AuditForbiddenError);
  });

  it('exports matching audit events as CSV', async () => {
    const audit = new FakeAuditRepository();
    await audit.save(event('a', AuditAction.CONTENT_CREATED, 'user-1'));
    const useCase = new ExportAuditCsvUseCase(audit);

    const csv = await useCase.execute({
      actorRole: 'ADMIN',
      targetType: 'content',
    });

    expect(csv).toContain('id,timestamp,actorId,actorIp,action,targetType,targetId,summary');
    expect(csv).toContain('CONTENT_CREATED');
    expect(csv).toContain('"{""result"":""ok""}"');
  });
});

function event(id: string, action: AuditAction, actorId: string): AuditEvent {
  return AuditEvent.rehydrate({
    id,
    timestamp: new Date('2026-05-18T00:00:00.000Z'),
    actorId,
    actorIp: '127.0.0.1',
    action,
    targetType: action === AuditAction.MEDIA_DELETED ? 'media' : 'content',
    targetId: `${id}-target`,
    summary: { result: 'ok' },
  });
}
