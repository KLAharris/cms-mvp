import { Role } from '../../domain/role';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenSigner,
} from '../../application/ports/out/token-signer.port';

export class FakeTokenSigner implements TokenSigner {
  readonly accessTokenPayloads: AccessTokenPayload[] = [];
  readonly refreshTokenPayloads: RefreshTokenPayload[] = [];

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    this.accessTokenPayloads.push(payload);
    return `access:${payload.userId}:${payload.role}`;
  }

  async signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    this.refreshTokenPayloads.push(payload);
    return `refresh:${payload.userId}`;
  }
}

export function expectedAccessToken(userId: string, role: Role): string {
  return `access:${userId}:${role}`;
}
