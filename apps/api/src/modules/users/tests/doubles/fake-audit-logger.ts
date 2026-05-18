import { AuditLogger } from '../../application/ports/out/audit-logger.port';

export type AuditLogCall = {
  action: string;
  actorId: string;
  actorIp?: string;
  targetId: string;
  occurredAt: Date;
};

export class FakeAuditLogger implements AuditLogger {
  readonly logCalls: AuditLogCall[] = [];

  log(params: AuditLogCall): Promise<void> {
    this.logCalls.push(params);
    return Promise.resolve();
  }
}
