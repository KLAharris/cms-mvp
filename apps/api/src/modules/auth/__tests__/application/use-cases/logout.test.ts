import { describe, expect, it } from 'vitest';

import { Logout } from '../../../application/use-cases/logout';
import { FakeAuditLogger } from '../../doubles/fake-audit-logger';
import { FakeClock } from '../../doubles/fake-clock';
import { FakeTokenBlocklist } from '../../doubles/fake-token-blocklist';
import { FakeTokenVerifier } from '../../doubles/fake-token-verifier';

const baseTime = new Date('2026-05-11T10:00:00.000Z');
const actorIp = '203.0.113.10';
const validPayload = {
  sub: 'user-1',
  jti: 'refresh-jti-1',
  exp: 1_800_000_000,
};

function setup(): {
  auditLogger: FakeAuditLogger;
  blocklist: FakeTokenBlocklist;
  logout: Logout;
} {
  const verifier = new FakeTokenVerifier(new Map([['valid-token', validPayload]]));
  const blocklist = new FakeTokenBlocklist();
  const clock = new FakeClock(baseTime);
  const auditLogger = new FakeAuditLogger();

  return {
    auditLogger,
    blocklist,
    logout: new Logout(verifier, blocklist, clock, auditLogger),
  };
}

describe('Logout', () => {
  it('adds a valid refresh token to the blocklist and logs audit details', async () => {
    const { auditLogger, blocklist, logout } = setup();

    await logout.execute({ refreshToken: 'valid-token', actorIp });

    await expect(blocklist.has('refresh-jti-1')).resolves.toBe(true);
    expect(auditLogger.logoutCalls).toEqual([
      {
        userId: 'user-1',
        actorIp,
        occurredAt: baseTime,
      },
    ]);
  });

  it('returns silently for an invalid refresh token', async () => {
    const { auditLogger, logout } = setup();

    await expect(
      logout.execute({ refreshToken: 'invalid-token', actorIp }),
    ).resolves.toBeUndefined();
    expect(auditLogger.logoutCalls).toEqual([]);
  });
});
