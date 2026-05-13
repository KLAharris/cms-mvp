export interface AuditLogger {
  log(params: {
    action: string;
    actorId: string;
    targetId: string;
    occurredAt: Date;
  }): Promise<void>;

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

  logTokenRefresh(params: {
    userId: string;
    actorIp: string;
    occurredAt: Date;
  }): Promise<void>;

  logLogout(params: {
    userId: string;
    actorIp: string;
    occurredAt: Date;
  }): Promise<void>;
}
