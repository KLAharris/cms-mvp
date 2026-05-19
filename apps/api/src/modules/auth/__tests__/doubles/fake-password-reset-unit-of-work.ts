import { PasswordResetUnitOfWork } from '../../application/ports/out/password-reset-unit-of-work.port';
import { User } from '../../domain/user';
import { FakePasswordResetTokenRepository } from './fake-password-reset-token-repository';
import { FakeUserRepository } from './fake-user-repository';

export class FakePasswordResetUnitOfWork implements PasswordResetUnitOfWork {
  readonly calls: Array<{ userId: string; tokenId: string; usedAt: Date }> = [];

  constructor(
    private readonly users: FakeUserRepository,
    private readonly tokens: FakePasswordResetTokenRepository,
  ) {}

  async resetPassword(user: User, tokenId: string, usedAt: Date): Promise<void> {
    this.calls.push({ userId: user.id, tokenId, usedAt });
    await this.users.save(user);
    await this.tokens.markUsed(tokenId, usedAt);
  }
}
