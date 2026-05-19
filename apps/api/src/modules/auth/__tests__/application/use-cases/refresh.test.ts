import { describe, expect, it } from 'vitest';

import { Email } from '../../../domain/email';
import { InvalidTokenError } from '../../../domain/errors';
import { Role } from '../../../domain/role';
import { User } from '../../../domain/user';
import { Refresh } from '../../../application/use-cases/refresh';
import { FakeAuditLogger } from '../../doubles/fake-audit-logger';
import { FakeClock } from '../../doubles/fake-clock';
import { FakeTokenBlocklist } from '../../doubles/fake-token-blocklist';
import { FakeTokenSigner } from '../../doubles/fake-token-signer';
import { FakeTokenVerifier } from '../../doubles/fake-token-verifier';
import { FakeUserRepository } from '../../doubles/fake-user-repository';

const baseTime = new Date('2026-05-11T10:00:00.000Z');
const actorIp = '203.0.113.10';
const validPayload = {
  sub: 'user-1',
  jti: 'refresh-jti-1',
  iat: 1_778_494_400,
  exp: 1_800_000_000,
};

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

function setup(payloads = new Map([['valid-token', validPayload]])): {
  auditLogger: FakeAuditLogger;
  blocklist: FakeTokenBlocklist;
  refresh: Refresh;
  users: FakeUserRepository;
} {
  const verifier = new FakeTokenVerifier(payloads);
  const signer = new FakeTokenSigner();
  const blocklist = new FakeTokenBlocklist();
  const clock = new FakeClock(baseTime);
  const auditLogger = new FakeAuditLogger();
  const users = new FakeUserRepository();
  users.seed(createUser());

  return {
    auditLogger,
    blocklist,
    refresh: new Refresh(verifier, signer, blocklist, clock, auditLogger, users),
    users,
  };
}

describe('Refresh', () => {
  it('returns a new access token for a valid refresh token', async () => {
    const { refresh } = setup();

    const result = await refresh.execute({ refreshToken: 'valid-token', actorIp });

    expect(result).toEqual({
      accessToken: 'access:user-1:EDITOR',
      accessTokenJti: 'access-jti:user-1',
    });
  });

  it('revokes the consumed refresh token after successful use', async () => {
    const { blocklist, refresh } = setup();

    await refresh.execute({ refreshToken: 'valid-token', actorIp });

    await expect(
      refresh.execute({ refreshToken: 'valid-token', actorIp }),
    ).rejects.toThrow(InvalidTokenError);
    await expect(blocklist.has('refresh-jti-1')).resolves.toBe(true);
  });

  it('throws InvalidTokenError for an invalid refresh token', async () => {
    const { refresh } = setup();

    await expect(
      refresh.execute({ refreshToken: 'invalid-token', actorIp }),
    ).rejects.toThrow(InvalidTokenError);
  });

  it('throws InvalidTokenError for a revoked refresh token', async () => {
    const { blocklist, refresh } = setup();
    await blocklist.add('refresh-jti-1', new Date(validPayload.exp * 1000));

    await expect(
      refresh.execute({ refreshToken: 'valid-token', actorIp }),
    ).rejects.toThrow(InvalidTokenError);
  });

  it('throws InvalidTokenError for a deactivated user refresh token', async () => {
    const { refresh, users } = setup();
    users.seed(createUser({ status: 'deactivated' }));

    await expect(
      refresh.execute({ refreshToken: 'valid-token', actorIp }),
    ).rejects.toThrow(InvalidTokenError);
  });

  it('throws InvalidTokenError when refresh token was issued before password change', async () => {
    const { refresh, users } = setup();
    users.seed(
      createUser({
        passwordChangedAt: new Date((validPayload.iat + 1) * 1000),
      }),
    );

    await expect(
      refresh.execute({ refreshToken: 'valid-token', actorIp }),
    ).rejects.toThrow(InvalidTokenError);
  });

  it('logs token refresh audit details on success', async () => {
    const { auditLogger, refresh } = setup();

    await refresh.execute({ refreshToken: 'valid-token', actorIp });

    expect(auditLogger.tokenRefreshCalls).toEqual([
      {
        userId: 'user-1',
        actorIp,
        occurredAt: baseTime,
      },
    ]);
  });
});
