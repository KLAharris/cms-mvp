import { describe, expect, it } from 'vitest';

import { Email } from '../../../domain/email';
import {
  AccountLockedError,
  InvalidCredentialsError,
  RateLimitExceededError,
} from '../../../domain/errors';
import { Role } from '../../../domain/role';
import { User } from '../../../domain/user';
import { Login } from '../../../application/use-cases/login';
import { FakeAuditLogger } from '../../doubles/fake-audit-logger';
import { FakeClock } from '../../doubles/fake-clock';
import { FakePasswordHasher } from '../../doubles/fake-password-hasher';
import { FakeRateLimiter } from '../../doubles/fake-rate-limiter';
import { expectedAccessToken, FakeTokenSigner } from '../../doubles/fake-token-signer';
import { FakeUserRepository } from '../../doubles/fake-user-repository';

const baseTime = new Date('2026-05-11T10:00:00.000Z');
const actorIp = '203.0.113.10';

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
    lastLoginAt: null,
    ...overrides,
  });
}

function setup(user: User | null = createUser(), rateLimiter = new FakeRateLimiter()): {
  auditLogger: FakeAuditLogger;
  clock: FakeClock;
  login: Login;
  passwords: FakePasswordHasher;
  rateLimiter: FakeRateLimiter;
  tokens: FakeTokenSigner;
  users: FakeUserRepository;
} {
  const users = new FakeUserRepository();
  const passwords = new FakePasswordHasher();
  const tokens = new FakeTokenSigner();
  const clock = new FakeClock(baseTime);
  const auditLogger = new FakeAuditLogger();

  if (user) {
    users.seed(user);
  }

  return {
    auditLogger,
    clock,
    login: new Login(users, passwords, tokens, clock, auditLogger, rateLimiter),
    passwords,
    rateLimiter,
    tokens,
    users,
  };
}

describe('Login', () => {
  it('returns tokens and user details for correct credentials', async () => {
    const { auditLogger, login } = setup();

    const result = await login.execute({
      email: 'editor@example.com',
      password: 'correct-password',
      actorIp,
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
    expect(auditLogger.successCalls).toEqual([
      {
        userId: 'user-1',
        actorIp,
        occurredAt: baseTime,
      },
    ]);
  });

  it('throws InvalidCredentialsError for an unknown email', async () => {
    const { auditLogger, login } = setup(null);

    await expect(
      login.execute({
        email: 'missing@example.com',
        password: 'correct-password',
        actorIp,
      }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(auditLogger.failureCalls).toEqual([
      {
        email: 'missing@example.com',
        actorIp,
        occurredAt: baseTime,
        reason: 'invalid_credentials',
      },
    ]);
  });

  it('throws InvalidCredentialsError for a wrong password', async () => {
    const { auditLogger, login } = setup();

    await expect(
      login.execute({ email: 'editor@example.com', password: 'wrong-password', actorIp }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(auditLogger.failureCalls).toEqual([
      {
        email: 'editor@example.com',
        actorIp,
        occurredAt: baseTime,
        reason: 'invalid_credentials',
      },
    ]);
  });

  it('increments failed attempts after a wrong password', async () => {
    const { login, users } = setup();

    await expect(
      login.execute({ email: 'editor@example.com', password: 'wrong-password', actorIp }),
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
      login.execute({ email: 'editor@example.com', password: 'wrong-password', actorIp }),
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
    const { auditLogger, login } = setup(locked);

    await expect(
      login.execute({ email: 'editor@example.com', password: 'correct-password', actorIp }),
    ).rejects.toThrow(AccountLockedError);
    expect(auditLogger.failureCalls).toEqual([
      {
        email: 'editor@example.com',
        actorIp,
        occurredAt: baseTime,
        reason: 'account_locked',
      },
    ]);
  });

  it('successful login resets failed counter and window', async () => {
    const user = createUser()
      .recordFailedLogin(baseTime)
      .recordFailedLogin(new Date(baseTime.getTime() + 60 * 1000));
    const { login, users } = setup(user);

    await login.execute({ email: 'editor@example.com', password: 'correct-password', actorIp });

    const saved = await users.findByEmail(Email.create('editor@example.com'));
    expect(saved?.failedLoginAttempts).toBe(0);
    expect(saved?.failedLoginWindowStartedAt).toBeNull();
    expect(saved?.lockedUntil).toBeNull();
  });

  it('signs tokens with the expected payloads', async () => {
    const { login, tokens } = setup();

    await login.execute({ email: 'editor@example.com', password: 'correct-password', actorIp });

    expect(tokens.accessTokenPayloads).toEqual([{ userId: 'user-1', role: Role.EDITOR }]);
    expect(tokens.refreshTokenPayloads).toEqual([{ userId: 'user-1' }]);
  });

  it('throws RateLimitExceededError when the login rate limit is exceeded', async () => {
    const { login } = setup(createUser(), new FakeRateLimiter(true));

    await expect(
      login.execute({ email: 'editor@example.com', password: 'correct-password', actorIp }),
    ).rejects.toThrow(RateLimitExceededError);
  });

  it('checks the per-IP login rate limit', async () => {
    const { login, rateLimiter } = setup();

    await login.execute({ email: 'editor@example.com', password: 'correct-password', actorIp });

    expect(rateLimiter.calls).toEqual([
      {
        key: `login:${actorIp}`,
        limit: 10,
        windowSeconds: 60,
      },
    ]);
  });

  it('successful login sets lastLoginAt and saves the user', async () => {
    const { login, users } = setup();

    await login.execute({ email: 'editor@example.com', password: 'correct-password', actorIp });

    const saved = await users.findByEmail(Email.create('editor@example.com'));
    expect(saved?.lastLoginAt).toEqual(baseTime);
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
      actorIp,
    });

    expect(result.accessToken).toBe(expectedAccessToken('user-1', Role.EDITOR));
  });
});
