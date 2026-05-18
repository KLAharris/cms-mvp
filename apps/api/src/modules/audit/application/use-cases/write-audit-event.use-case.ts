import { randomUUID } from 'crypto';

import { AuditAction, AuditEvent, AuditPort, AuditSummary } from '../../domain';

export type WriteAuditEventCommand = {
  actorId: string | null;
  actorIp: string;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  summary: AuditSummary;
  occurredAt?: Date;
};

export class WriteAuditEventUseCase {
  constructor(private readonly audit: AuditPort) {}

  async execute(command: WriteAuditEventCommand): Promise<void> {
    await this.audit.save(
      AuditEvent.create({
        id: randomUUID(),
        actorId: command.actorId,
        actorIp: command.actorIp,
        action: command.action,
        targetType: command.targetType,
        targetId: command.targetId,
        summary: command.summary,
        timestamp: command.occurredAt,
      }),
    );
  }
}
