import { AuditLogger } from '../ports/out/audit-logger.port';
import { Clock } from '../ports/out/clock.port';
import { TokenBlocklist } from '../ports/out/token-blocklist.port';
import { TokenSigner } from '../ports/out/token-signer.port';
import { TokenVerifier } from '../ports/out/token-verifier.port';
import { UserRepository } from '../ports/out/user-repository.port';
import { InvalidTokenError } from '../../domain/errors';

export type RefreshCommand = {
  refreshToken: string;
  actorIp: string;
};

export type RefreshResult = {
  accessToken: string;
  accessTokenJti: string;
};

export class Refresh {
  constructor(
    private readonly tokenVerifier: TokenVerifier,
    private readonly tokenSigner: TokenSigner,
    private readonly tokenBlocklist: TokenBlocklist,
    private readonly clock: Clock,
    private readonly auditLogger: AuditLogger,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: RefreshCommand): Promise<RefreshResult> {
    const payload = await this.tokenVerifier.verifyRefreshToken(command.refreshToken);
    const revoked = await this.tokenBlocklist.has(payload.jti);

    if (revoked) {
      throw new InvalidTokenError();
    }

    const user = await this.userRepository.findById(payload.sub);

    if (user === null || user.status === 'deactivated') {
      throw new InvalidTokenError();
    }

    const accessToken = await this.tokenSigner.signAccessToken({
      userId: user.id,
      role: user.role,
    });
    const expiresAt = new Date(payload.exp * 1000);
    const occurredAt = this.clock.now();

    await this.tokenBlocklist.add(payload.jti, expiresAt);
    await this.auditLogger.logTokenRefresh({
      userId: payload.sub,
      actorIp: command.actorIp,
      occurredAt,
    });

    return {
      accessToken: accessToken.token,
      accessTokenJti: accessToken.jti,
    };
  }
}
