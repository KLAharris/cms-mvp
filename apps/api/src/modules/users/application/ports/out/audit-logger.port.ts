export interface AuditLogger {
  log(params: {
    action: string;
    actorId: string;
    actorIp?: string;
    targetId: string;
    occurredAt: Date;
  }): Promise<void>;
}
