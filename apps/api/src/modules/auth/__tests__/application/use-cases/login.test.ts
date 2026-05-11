import { describe, expect, it } from 'vitest';

import { Email } from '../../../domain/email';
import { AccountLockedError, InvalidCredentialsError } from '../../../domain/errors';
import { Role } from '../../../domain/role';
import { User } from '../../../domain/user';
import { Login } from '../../../application/use-cases/login';
import { FakeClock } from '../../doubles/fake-clock';
import { FakePasswordHasher } from '../../doubles/fake-password-hasher';
import { expectedAccessToken, FakeTokenSigner } from '../../doubles/fake-token-signer';
import { FakeUserRepository } from '../../doubles/fake-user-repository';

const baseTime = new Date('2026-05-11T10:00:00.000Z');

function createUser(overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User {
  return new User({
    id: 'user-1',
    email: Email.create('editor@example.com'),
    passwordHash: 'hashed:correct-password',
    role: Role.EDITOR,
    status: 'active',
    failedLoginAttempts: 0,
    failedLoginWindowStartedAt: null,
    lockedUntil: null,
    ...overrides,
  });
}

function setup(user: User | null = createUser()): {
  clock: FakeClock;
  login: Login;
  passwords: FakePasswordHasher;
  tokens: FakeTokenSigner;
  users: FakeUserRepository;
} {
  const users = new FakeUserRepository();
  const passwords = new FakePasswordHasher();
  const tokens = new FakeTokenSigner();
  const clock = new FakeClock(baseTime);

  if (user) {
    users.seed(user);
  }

  return {
    clock,
    login: new Login(users, passwords, tokens, clock),
    passwords,
    tokens,
    users,
  };
}

describe('Login', () => {
  it('returns tokens and user details for correct credentials', async () => {
    const { login } = setup();

    const result = await login.execute({
      email: 'editor@example.com',
      password: 'correct-password',
    });

    expect(result).toEqual({
      accessToken: expectedAccessToken('user-1', Role.EDITOR),
      refreshToken: 'refresh:user-1',
      user: {
        id: 'user-1',
        email: 'editor@example.com',
        role: Role.EDITOR,
      },
    });
  });

  it('throws InvalidCredentialsError for an unknown email', async () => {
    const { login } = setup(null);

    await expect(
      login.execute({ email: 'missing@example.com', password: 'correct-password' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError for a wrong password', async () => {
    const { login } = setup();

    await expect(
      login.execute({ email: 'editor@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('increments failed attempts after a wrong password', async () => {
    const { login, users } = setup();

    await expect(
      login.execute({ email: 'editor@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(InvalidCredentialsError);

    const saved = await users.findByEmail(Email.create('editor@example.com'));
    expect(saved?.failedLoginAttempts).toBe(1);
    expect(saved?.failedLoginWindowStartedAt).toEqual(baseTime);
  });

  it('locks the account on the fifth wrong password in the same window', async () => {
    const user = [0, 1, 2, 3].reduce(
      (current, minutes) =>
        current.recordFailedLogin(new Date(baseTime.getTime() + minutes * 60 * 1000)),
      createUser(),
    );
    const { login, users } = setup(user);

    await expect(
      login.execute({ email: 'editor@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(InvalidCredentialsError);

    const saved = await users.findByEmail(Email.create('editor@example.com'));
    expect(saved?.failedLoginAttempts).toBe(5);
    expect(saved?.isLocked(baseTime)).toBe(true);
  });

  it('throws AccountLockedError for correct credentials while locked', async () => {
    const locked = [0, 1, 2, 3, 4].reduce(
      (current, minutes) =>
        current.recordFailedLogin(new Date(baseTime.getTime() + minutes * 60 * 1000)),
      createUser(),
    );
    const { login } = setup(locked);

    await expect(
      login.execute({ email: 'editor@example.com', password: 'correct-password' }),
    ).rejects.toThrow(AccountLockedError);
  });

  it('successful login resets failed counter and window', async () => {
    const user = createUser()
      .recordFailedLogin(baseTime)
      .recordFailedLogin(new Date(baseTime.getTime() + 60 * 1000));
    const { login, users } = setup(user);

    await login.execute({ email: 'editor@example.com', password: 'correct-password' });

    const saved = await users.findByEmail(Email.create('editor@example.com'));
    expect(saved?.failedLoginAttempts).toBe(0);
    expect(saved?.failedLoginWindowStartedAt).toBeNull();
    expect(saved?.lockedUntil).toBeNull();
  });

  it('signs tokens with the expected payloads', async () => {
    const { login, tokens } = setup();

    await login.execute({ email: 'editor@example.com', password: 'correct-password' });

    expect(tokens.accessTokenPayloads).toEqual([{ userId: 'user-1', role: Role.EDITOR }]);
    expect(tokens.refreshTokenPayloads).toEqual([{ userId: 'user-1' }]);
  });

  it('allows login after lockout expires', async () => {
    const locked = [0, 1, 2, 3, 4].reduce(
      (current, minutes) =>
        current.recordFailedLogin(new Date(baseTime.getTime() + minutes * 60 * 1000)),
      createUser(),
    );
    const { clock, login } = setup(locked);
    clock.advance(19 * 60 * 1000 + 1);

    const result = await login.execute({
      email: 'editor@example.com',
      password: 'correct-password',
    });

    expect(result.accessToken).toBe(expectedAccessToken('user-1', Role.EDITOR));
  });
});
