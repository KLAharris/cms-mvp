import { AuditAction, AuditEvent, AuditPort } from '../../../domain';
import { AuditLogger as AuthAuditLogger } from '../../../../auth/application/ports/out/audit-logger.port';
import { AuditLogger as UsersAuditLogger } from '../../../../users/application/ports/out/audit-logger.port';

export class AuditLoggerAdapter implements AuthAuditLogger, UsersAuditLogger {
  constructor(private readonly audit: AuditPort) {}

  async log(params: {
    action: string;
    actorId: string;
    actorIp?: string;
    targetId: string;
    occurredAt: Date;
  }): Promise<void> {
    await this.audit.save(
      AuditEvent.create({
        actorId: params.actorId,
        actorIp: params.actorIp ?? 'unknown',
        action: this.mapLegacyAction(params.action),
        targetType: 'user',
        targetId: params.targetId,
        summary: { legacyAction: params.action },
        timestamp: params.occurredAt,
      }),
    );
  }

  async logLoginSuccess(params: {
    userId: string;
    actorIp: string;
    occurredAt: Date;
  }): Promise<void> {
    await this.audit.save(
      AuditEvent.create({
        actorId: params.userId,
        actorIp: params.actorIp,
        action: AuditAction.USER_LOGIN,
        targetType: 'user',
        targetId: params.userId,
        summary: { result: 'success' },
        timestamp: params.occurredAt,
      }),
    );
  }

  async logLoginFailure(params: {
    email: string;
    actorIp: string;
    occurredAt: Date;
    reason: 'invalid_credentials' | 'account_locked';
  }): Promise<void> {
    await this.audit.save(
      AuditEvent.create({
        actorId: null,
        actorIp: params.actorIp,
        action: AuditAction.USER_LOGIN_FAILED,
        targetType: 'user',
        targetId: null,
        summary: { reason: params.reason },
        timestamp: params.occurredAt,
      }),
    );
  }

  async logTokenRefresh(params: {
    userId: string;
    actorIp: string;
    occurredAt: Date;
  }): Promise<void> {
    await this.audit.save(
      AuditEvent.create({
        actorId: params.userId,
        actorIp: params.actorIp,
        action: AuditAction.USER_LOGIN,
        targetType: 'user',
        targetId: params.userId,
        summary: { result: 'token_refresh' },
        timestamp: params.occurredAt,
      }),
    );
  }

  async logLogout(params: {
    userId: string;
    actorIp: string;
    occurredAt: Date;
  }): Promise<void> {
    await this.audit.save(
      AuditEvent.create({
        actorId: params.userId,
        actorIp: params.actorIp,
        action: AuditAction.USER_LOGOUT,
        targetType: 'user',
        targetId: params.userId,
        summary: {},
        timestamp: params.occurredAt,
      }),
    );
  }

  private mapLegacyAction(action: string): AuditAction {
    if (action === 'user.invite') return AuditAction.USER_CREATED;
    if (action === 'user.update') return AuditAction.USER_UPDATED;
    if (action === 'user.deactivate') return AuditAction.USER_DEACTIVATED;
    return AuditAction.USER_UPDATED;
  }
}
