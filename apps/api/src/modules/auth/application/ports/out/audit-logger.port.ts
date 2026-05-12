export interface AuditLogger {
  logLoginSuccess(params: {
    userId: string;
    actorIp: string;
    occurredAt: Date;
  }): Promise<void>;

  logLoginFailure(params: {
    email: string;
    actorIp: string;
    occurredAt: Date;
    reason: 'invalid_credentials' | 'account_locked';
  }): Promise<void>;
}
