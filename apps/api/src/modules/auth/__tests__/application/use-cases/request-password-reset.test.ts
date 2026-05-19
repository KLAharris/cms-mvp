import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { Email } from '../../../domain/email';
import { Role } from '../../../domain/role';
import { User } from '../../../domain/user';
import { RequestPasswordReset } from '../../../application/use-cases/request-password-reset';
import { FakeClock } from '../../doubles/fake-clock';
import { FakeNotificationService } from '../../doubles/fake-notification-service';
import { FakePasswordResetTokenRepository } from '../../doubles/fake-password-reset-token-repository';
import { FakeResetTokenGenerator } from '../../doubles/fake-reset-token-generator';
import { FakeUserRepository } from '../../doubles/fake-user-repository';

const baseTime = new Date('2026-05-19T10:00:00.000Z');

function createUser(overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User {
  return new User({
    id: 'user-1',
    email: Email.create('editor@example.com'),
    passwordHash: 'hashed:old-password',
    role: Role.EDITOR,
    status: 'active',
    failedLoginAttempts: 0,
    failedLoginWindowStartedAt: null,
    lockedUntil: null,
    lastLoginAt: null,
    ...overrides,
  });
}

function setup(user: User | null = createUser()): {
  notifications: FakeNotificationService;
  requestReset: RequestPasswordReset;
  tokens: FakePasswordResetTokenRepository;
} {
  const users = new FakeUserRepository();
  const tokens = new FakePasswordResetTokenRepository();
  const notifications = new FakeNotificationService();

  if (user) {
    users.seed(user);
  }

  return {
    notifications,
    requestReset: new RequestPasswordReset(
      users,
      tokens,
      new FakeResetTokenGenerator(['raw-reset-token-1']),
      new FakeClock(baseTime),
      notifications,
    ),
    tokens,
  };
}

describe('RequestPasswordReset', () => {
  it('silently returns for an unknown email', async () => {
    const { notifications, requestReset, tokens } = setup(null);

    await requestReset.execute({ email: 'missing@example.com' });

    expect(tokens.saved()).toEqual([]);
    expect(notifications.passwordResetEmails).toEqual([]);
  });

  it('silently returns for a deactivated user', async () => {
    const { notifications, requestReset, tokens } = setup(
      createUser({ status: 'deactivated' }),
    );

    await requestReset.execute({ email: 'editor@example.com' });

    expect(tokens.saved()).toEqual([]);
    expect(notifications.passwordResetEmails).toEqual([]);
  });

  it('stores a hashed one-hour token and sends the raw token', async () => {
    const { notifications, requestReset, tokens } = setup();
    const expectedHash = createHash('sha256').update('raw-reset-token-1').digest('hex');

    await requestReset.execute({ email: 'editor@example.com' });

    expect(tokens.saved()).toMatchObject([
      {
        tokenHash: expectedHash,
        userId: 'user-1',
        expiresAt: new Date(baseTime.getTime() + 60 * 60 * 1000),
        usedAt: null,
      },
    ]);
    expect(notifications.passwordResetEmails).toEqual([
      { to: 'editor@example.com', token: 'raw-reset-token-1' },
    ]);
  });
});
