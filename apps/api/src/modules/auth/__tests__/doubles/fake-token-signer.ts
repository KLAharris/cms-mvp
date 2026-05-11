import { Role } from '../../domain/role';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenSigner,
} from '../../application/ports/out/token-signer.port';

export class FakeTokenSigner implements TokenSigner {
  readonly accessTokenPayloads: AccessTokenPayload[] = [];
  readonly refreshTokenPayloads: RefreshTokenPayload[] = [];

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    this.accessTokenPayloads.push(payload);
    return Promise.resolve(`access:${payload.userId}:${payload.role}`);
  }

  signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    this.refreshTokenPayloads.push(payload);
    return Promise.resolve(`refresh:${payload.userId}`);
  }
}

export function expectedAccessToken(userId: string, role: Role): string {
  return `access:${userId}:${role}`;
}
