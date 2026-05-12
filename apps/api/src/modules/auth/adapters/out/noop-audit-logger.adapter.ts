import { Injectable } from '@nestjs/common';

import { AuditLogger } from '../../application/ports/out/audit-logger.port';

@Injectable()
export class NoopAuditLogger implements AuditLogger {
  logLoginSuccess(): Promise<void> {
    return Promise.resolve();
  }

  logLoginFailure(): Promise<void> {
    return Promise.resolve();
  }
}
