import { createHash } from 'crypto';

import {
  AcceptInviteCommand,
  AcceptInviteUseCase,
} from '../ports/in/accept-invite.port';
import { Clock } from '../ports/out/clock.port';
import { PasswordHasher } from '../ports/out/password-hasher.port';
import { UserRepository } from '../ports/out/user-repository.port';
import { InviteExpiredError, UserNotFoundError } from '../../domain/errors';

export class AcceptInvite implements AcceptInviteUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: AcceptInviteCommand): Promise<void> {
    const sha256Hash = createHash('sha256').update(cmd.token).digest('hex');
    const user = await this.userRepository.findInvitedByTokenHash(sha256Hash);

    if (user === null) {
      throw new UserNotFoundError();
    }

    if (user.inviteExpiresAt !== null && user.inviteExpiresAt < this.clock.now()) {
      throw new InviteExpiredError();
    }

    const passwordHash = await this.passwordHasher.hash(cmd.password);
    user.activate(passwordHash);
    await this.userRepository.save(user);
  }
}
