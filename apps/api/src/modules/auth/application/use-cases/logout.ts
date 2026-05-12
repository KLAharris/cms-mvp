import { AuditLogger } from '../ports/out/audit-logger.port';
import { Clock } from '../ports/out/clock.port';
import { TokenBlocklist } from '../ports/out/token-blocklist.port';
import { TokenVerifier } from '../ports/out/token-verifier.port';

export type LogoutCommand = {
  refreshToken: string;
  actorIp: string;
};

export class Logout {
  constructor(
    private readonly tokenVerifier: TokenVerifier,
    private readonly tokenBlocklist: TokenBlocklist,
    private readonly clock: Clock,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    let payload: Awaited<ReturnType<TokenVerifier['verifyRefreshToken']>>;

    try {
      payload = await this.tokenVerifier.verifyRefreshToken(command.refreshToken);
    } catch {
      return;
    }

    const expiresAt = new Date(payload.exp * 1000);

    await this.tokenBlocklist.add(payload.jti, expiresAt);
    await this.auditLogger.logLogout({
      userId: payload.sub,
      actorIp: command.actorIp,
      occurredAt: this.clock.now(),
    });
  }
}
