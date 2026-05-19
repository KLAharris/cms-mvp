import { createHash } from 'node:crypto';

import {
  InvalidResetTokenError,
  UserNotFoundError,
  WeakPasswordError,
} from '../../domain/errors';
import { Clock } from '../ports/out/clock.port';
import { PasswordHasher } from '../ports/out/password-hasher.port';
import { PasswordResetTokenPort } from '../ports/out/password-reset-token.port';
import { PasswordResetUnitOfWork } from '../ports/out/password-reset-unit-of-work.port';
import { UserRepository } from '../ports/out/user-repository.port';

export type ResetPasswordCommand = {
  token: string;
  password: string;
};

export class ResetPassword {
  constructor(
    private readonly users: UserRepository,
    private readonly resetTokens: PasswordResetTokenPort,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: Clock,
    private readonly unitOfWork: PasswordResetUnitOfWork,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const now = this.clock.now();
    const resetToken = await this.resetTokens.findByHash(sha256(command.token));

    if (resetToken === null || !resetToken.isValid(now)) {
      throw new InvalidResetTokenError();
    }

    if (!isStrongPassword(command.password)) {
      throw new WeakPasswordError();
    }

    const user = await this.users.findById(resetToken.userId);

    if (user === null) {
      throw new UserNotFoundError();
    }

    user.passwordHash = await this.passwordHasher.hash(command.password);
    user.passwordChangedAt = now;

    await this.unitOfWork.resetPassword(user, resetToken.id, now);
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isStrongPassword(password: string): boolean {
  return password.length >= 12 && /[a-z]/i.test(password) && /\d/.test(password);
}
