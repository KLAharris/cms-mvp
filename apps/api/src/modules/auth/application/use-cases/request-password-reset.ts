import { createHash, randomUUID } from 'node:crypto';

import { Email } from '../../domain/email';
import { PasswordResetToken } from '../../domain/password-reset-token';
import { Clock } from '../ports/out/clock.port';
import { PasswordResetNotifier } from '../ports/out/password-reset-notifier.port';
import { PasswordResetTokenPort } from '../ports/out/password-reset-token.port';
import { ResetTokenGenerator } from '../ports/out/reset-token-generator.port';
import { UserRepository } from '../ports/out/user-repository.port';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export type RequestPasswordResetCommand = {
  email: string;
};

export class RequestPasswordReset {
  constructor(
    private readonly users: UserRepository,
    private readonly resetTokens: PasswordResetTokenPort,
    private readonly tokenGenerator: ResetTokenGenerator,
    private readonly clock: Clock,
    private readonly notifier: PasswordResetNotifier,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const user = await this.users.findByEmail(Email.create(command.email));

    if (user === null || user.status === 'deactivated') {
      return;
    }

    const rawToken = this.tokenGenerator.generate();
    const now = this.clock.now();
    const resetToken = new PasswordResetToken({
      id: randomUUID(),
      tokenHash: sha256(rawToken),
      userId: user.id,
      expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
      usedAt: null,
      createdAt: now,
    });

    await this.resetTokens.save(resetToken);
    await this.notifier.sendPasswordResetEmail(user.email.value, rawToken);
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
