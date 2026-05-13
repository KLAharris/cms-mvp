import { Injectable } from '@nestjs/common';

import { AuditLogger } from '../../application/ports/out/audit-logger.port';

@Injectable()
export class NoopAuditLogger implements AuditLogger {
  log(): Promise<void> {
    return Promise.resolve();
  }

  logLoginSuccess(): Promise<void> {
    return Promise.resolve();
  }

  logLoginFailure(): Promise<void> {
    return Promise.resolve();
  }

  logTokenRefresh(): Promise<void> {
    return Promise.resolve();
  }

  logLogout(): Promise<void> {
    return Promise.resolve();
  }
}
