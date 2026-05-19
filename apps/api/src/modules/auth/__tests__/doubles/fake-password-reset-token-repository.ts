import { PasswordResetTokenPort } from '../../application/ports/out/password-reset-token.port';
import { PasswordResetToken } from '../../domain/password-reset-token';

export class FakePasswordResetTokenRepository implements PasswordResetTokenPort {
  private readonly tokens = new Map<string, PasswordResetToken>();

  seed(token: PasswordResetToken): void {
    this.tokens.set(token.tokenHash, token);
  }

  saved(): PasswordResetToken[] {
    return Array.from(this.tokens.values());
  }

  save(token: PasswordResetToken): Promise<void> {
    this.tokens.set(token.tokenHash, token);
    return Promise.resolve();
  }

  findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return Promise.resolve(this.tokens.get(tokenHash) ?? null);
  }

  markUsed(id: string, usedAt: Date): Promise<void> {
    const token = Array.from(this.tokens.values()).find((candidate) => candidate.id === id);

    if (token) {
      this.tokens.set(
        token.tokenHash,
        new PasswordResetToken({
          id: token.id,
          tokenHash: token.tokenHash,
          userId: token.userId,
          expiresAt: token.expiresAt,
          usedAt,
          createdAt: token.createdAt,
        }),
      );
    }

    return Promise.resolve();
  }
}
