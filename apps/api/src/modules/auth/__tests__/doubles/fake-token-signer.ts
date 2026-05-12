import { Role } from '../../domain/role';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  SignedToken,
  TokenSigner,
} from '../../application/ports/out/token-signer.port';

export class FakeTokenSigner implements TokenSigner {
  readonly accessTokenPayloads: AccessTokenPayload[] = [];
  readonly refreshTokenPayloads: RefreshTokenPayload[] = [];

  signAccessToken(payload: AccessTokenPayload): Promise<SignedToken> {
    this.accessTokenPayloads.push(payload);
    return Promise.resolve({
      token: `access:${payload.userId}:${payload.role ?? 'none'}`,
      jti: `access-jti:${payload.userId}`,
    });
  }

  signRefreshToken(payload: RefreshTokenPayload): Promise<SignedToken> {
    this.refreshTokenPayloads.push(payload);
    return Promise.resolve({
      token: `refresh:${payload.userId}`,
      jti: `refresh-jti:${payload.userId}`,
    });
  }
}

export function expectedAccessToken(userId: string, role: Role): string {
  return `access:${userId}:${role}`;
}
