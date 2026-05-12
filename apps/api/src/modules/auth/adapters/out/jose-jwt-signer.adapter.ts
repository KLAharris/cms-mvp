import { Inject, Injectable } from '@nestjs/common';

import {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenSigner,
} from '../../application/ports/out/token-signer.port';

@Injectable()
export class JoseJwtSigner implements TokenSigner {
  private readonly secretKey: Uint8Array;

  constructor(@Inject('JWT_SECRET') jwtSecret: string) {
    this.secretKey = new TextEncoder().encode(jwtSecret);
  }

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    const { SignJWT } = await import('jose');

    return new SignJWT({ sub: payload.userId, role: payload.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(this.secretKey);
  }

  async signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    const { SignJWT } = await import('jose');

    return new SignJWT({ sub: payload.userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(this.secretKey);
  }
}
