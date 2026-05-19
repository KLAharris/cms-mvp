import { Inject, Injectable } from '@nestjs/common';

import { TokenVerifier } from '../../application/ports/out/token-verifier.port';
import { InvalidTokenError } from '../../domain/errors';

@Injectable()
export class JoseJwtVerifier implements TokenVerifier {
  private readonly secretKey: Uint8Array;

  constructor(@Inject('JWT_SECRET') jwtSecret: string) {
    this.secretKey = new TextEncoder().encode(jwtSecret);
  }

  async verifyRefreshToken(
    token: string,
  ): Promise<{ sub: string; jti: string; iat?: number; exp: number }> {
    try {
      const { jwtVerify } = await import('jose');
      const { payload } = await jwtVerify(token, this.secretKey, {
        algorithms: ['HS256'],
      });

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.jti !== 'string' ||
        typeof payload.exp !== 'number'
      ) {
        throw new InvalidTokenError();
      }

      return {
        sub: payload.sub,
        jti: payload.jti,
        iat: typeof payload.iat === 'number' ? payload.iat : undefined,
        exp: payload.exp,
      };
    } catch {
      throw new InvalidTokenError();
    }
  }
}
