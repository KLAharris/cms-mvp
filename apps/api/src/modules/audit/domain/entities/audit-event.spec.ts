import { describe, expect, it } from 'vitest';

import { AuditAction, AuditEvent } from './audit-event';

describe('AuditEvent', () => {
  it('creates an event with required fields', () => {
    const timestamp = new Date('2026-05-18T00:00:00.000Z');

    const event = AuditEvent.create({
      id: 'audit-1',
      timestamp,
      actorId: 'user-1',
      actorIp: '127.0.0.1',
      action: AuditAction.CONTENT_CREATED,
      targetType: 'content',
      targetId: 'content-1',
      summary: { title: 'Hello' },
    });

    expect(event.id).toBe('audit-1');
    expect(event.timestamp).toBe(timestamp);
    expect(event.actorId).toBe('user-1');
    expect(event.actorIp).toBe('127.0.0.1');
    expect(event.action).toBe(AuditAction.CONTENT_CREATED);
    expect(event.targetType).toBe('content');
    expect(event.targetId).toBe('content-1');
    expect(event.summary).toEqual({ title: 'Hello' });
  });

  it('allows system events without actor or target', () => {
    const event = AuditEvent.create({
      id: 'audit-2',
      actorId: null,
      actorIp: '127.0.0.1',
      action: AuditAction.USER_LOGIN_FAILED,
      targetType: 'user',
      targetId: null,
      summary: { reason: 'invalid_credentials' },
    });

    expect(event.actorId).toBeNull();
    expect(event.targetId).toBeNull();
  });

  it('rejects a missing actor IP', () => {
    expect(() =>
      AuditEvent.create({
        id: 'audit-3',
        actorId: 'user-1',
        actorIp: '',
        action: AuditAction.USER_LOGIN,
        targetType: 'user',
        targetId: 'user-1',
        summary: {},
      }),
    ).toThrow('actorIp is required');
  });

  it('rejects a missing target type', () => {
    expect(() =>
      AuditEvent.create({
        id: 'audit-4',
        actorId: 'user-1',
        actorIp: '127.0.0.1',
        action: AuditAction.USER_LOGIN,
        targetType: '',
        targetId: 'user-1',
        summary: {},
      }),
    ).toThrow('targetType is required');
  });
});
