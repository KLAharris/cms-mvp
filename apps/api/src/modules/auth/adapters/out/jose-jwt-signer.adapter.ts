import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  AccessTokenPayload,
  RefreshTokenPayload,
  SignedToken,
  TokenSigner,
} from '../../application/ports/out/token-signer.port';

@Injectable()
export class JoseJwtSigner implements TokenSigner {
  private readonly secretKey: Uint8Array;

  constructor(@Inject('JWT_SECRET') jwtSecret: string) {
    this.secretKey = new TextEncoder().encode(jwtSecret);
  }

  async signAccessToken(payload: AccessTokenPayload): Promise<SignedToken> {
    const { SignJWT } = await import('jose');
    const jti = randomUUID();

    const token = await new SignJWT({ sub: payload.userId, role: payload.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(jti)
      .setExpirationTime('15m')
      .sign(this.secretKey);

    return { token, jti };
  }

  async signRefreshToken(payload: RefreshTokenPayload): Promise<SignedToken> {
    const { SignJWT } = await import('jose');
    const jti = randomUUID();

    const token = await new SignJWT({ sub: payload.userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(jti)
      .setExpirationTime('7d')
      .sign(this.secretKey);

    return { token, jti };
  }
}
