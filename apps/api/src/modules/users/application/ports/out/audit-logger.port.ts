export interface AuditLogger {
  log(params: {
    action: string;
    actorId: string;
    targetId: string;
    occurredAt: Date;
  }): Promise<void>;
}
