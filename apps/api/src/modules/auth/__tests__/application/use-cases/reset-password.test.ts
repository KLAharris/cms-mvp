import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { Email } from '../../../domain/email';
import {
  InvalidResetTokenError,
  UserNotFoundError,
  WeakPasswordError,
} from '../../../domain/errors';
import { PasswordResetToken } from '../../../domain/password-reset-token';
import { Role } from '../../../domain/role';
import { User } from '../../../domain/user';
import { ResetPassword } from '../../../application/use-cases/reset-password';
import { FakeClock } from '../../doubles/fake-clock';
import { FakePasswordHasher } from '../../doubles/fake-password-hasher';
import { FakePasswordResetTokenRepository } from '../../doubles/fake-password-reset-token-repository';
import { FakePasswordResetUnitOfWork } from '../../doubles/fake-password-reset-unit-of-work';
import { FakeUserRepository } from '../../doubles/fake-user-repository';

const baseTime = new Date('2026-05-19T10:00:00.000Z');
const rawToken = 'raw-reset-token-1';
const tokenHash = createHash('sha256').update(rawToken).digest('hex');

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

function createToken(
  overrides: Partial<ConstructorParameters<typeof PasswordResetToken>[0]> = {},
): PasswordResetToken {
  return new PasswordResetToken({
    id: 'reset-token-1',
    tokenHash,
    userId: 'user-1',
    expiresAt: new Date(baseTime.getTime() + 60 * 60 * 1000),
    usedAt: null,
    ...overrides,
  });
}

function setup(user: User | null = createUser(), token: PasswordResetToken | null = createToken()) {
  const users = new FakeUserRepository();
  const tokens = new FakePasswordResetTokenRepository();

  if (user) {
    users.seed(user);
  }

  if (token) {
    tokens.seed(token);
  }

  const unitOfWork = new FakePasswordResetUnitOfWork(users, tokens);
  const resetPassword = new ResetPassword(
    users,
    tokens,
    new FakePasswordHasher(),
    new FakeClock(baseTime),
    unitOfWork,
  );

  return { resetPassword, tokens, unitOfWork, users };
}

describe('ResetPassword', () => {
  it('updates the password, sets passwordChangedAt, and marks the token used', async () => {
    const { resetPassword, tokens, unitOfWork, users } = setup();

    await resetPassword.execute({ token: rawToken, password: 'new-password1' });

    const savedUser = await users.findById('user-1');
    const savedToken = await tokens.findByHash(tokenHash);
    expect(savedUser?.passwordHash).toBe('hashed:new-password1');
    expect(savedUser?.passwordChangedAt).toEqual(baseTime);
    expect(savedToken?.usedAt).toEqual(baseTime);
    expect(unitOfWork.calls).toEqual([
      { userId: 'user-1', tokenId: 'reset-token-1', usedAt: baseTime },
    ]);
  });

  it('rejects an unknown token', async () => {
    const { resetPassword } = setup(createUser(), null);

    await expect(
      resetPassword.execute({ token: rawToken, password: 'new-password1' }),
    ).rejects.toThrow(InvalidResetTokenError);
  });

  it('rejects an expired token', async () => {
    const { resetPassword } = setup(
      createUser(),
      createToken({ expiresAt: new Date(baseTime.getTime() - 1) }),
    );

    await expect(
      resetPassword.execute({ token: rawToken, password: 'new-password1' }),
    ).rejects.toThrow(InvalidResetTokenError);
  });

  it('rejects a used token', async () => {
    const { resetPassword } = setup(createUser(), createToken({ usedAt: baseTime }));

    await expect(
      resetPassword.execute({ token: rawToken, password: 'new-password1' }),
    ).rejects.toThrow(InvalidResetTokenError);
  });

  it('rejects a weak password', async () => {
    const { resetPassword } = setup();

    await expect(
      resetPassword.execute({ token: rawToken, password: 'short1' }),
    ).rejects.toThrow(WeakPasswordError);
  });

  it('rejects when the token user no longer exists', async () => {
    const { resetPassword } = setup(null, createToken());

    await expect(
      resetPassword.execute({ token: rawToken, password: 'new-password1' }),
    ).rejects.toThrow(UserNotFoundError);
  });
});
