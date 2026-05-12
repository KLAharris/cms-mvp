import { AuditLogger } from '../../application/ports/out/audit-logger.port';

export type LoginSuccessAuditCall = {
  userId: string;
  actorIp: string;
  occurredAt: Date;
};

export type LoginFailureAuditCall = {
  email: string;
  actorIp: string;
  occurredAt: Date;
  reason: 'invalid_credentials' | 'account_locked';
};

export type TokenRefreshAuditCall = {
  userId: string;
  actorIp: string;
  occurredAt: Date;
};

export type LogoutAuditCall = {
  userId: string;
  actorIp: string;
  occurredAt: Date;
};

export class FakeAuditLogger implements AuditLogger {
  readonly successCalls: LoginSuccessAuditCall[] = [];
  readonly failureCalls: LoginFailureAuditCall[] = [];
  readonly tokenRefreshCalls: TokenRefreshAuditCall[] = [];
  readonly logoutCalls: LogoutAuditCall[] = [];

  logLoginSuccess(params: LoginSuccessAuditCall): Promise<void> {
    this.successCalls.push(params);
    return Promise.resolve();
  }

  logLoginFailure(params: LoginFailureAuditCall): Promise<void> {
    this.failureCalls.push(params);
    return Promise.resolve();
  }

  logTokenRefresh(params: TokenRefreshAuditCall): Promise<void> {
    this.tokenRefreshCalls.push(params);
    return Promise.resolve();
  }

  logLogout(params: LogoutAuditCall): Promise<void> {
    this.logoutCalls.push(params);
    return Promise.resolve();
  }
}
