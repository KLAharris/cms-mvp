import {
  RefreshTokenPayload,
  TokenVerifier,
} from '../../application/ports/out/token-verifier.port';
import { InvalidTokenError } from '../../domain/errors';

export class FakeTokenVerifier implements TokenVerifier {
  constructor(private readonly payloads: Map<string, RefreshTokenPayload>) {}

  verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const payload = this.payloads.get(token);

    if (!payload) {
      throw new InvalidTokenError();
    }

    return Promise.resolve(payload);
  }
}
