import { describe, expect, it } from 'vitest';

import { PasswordResetToken } from '../../domain/password-reset-token';

const baseTime = new Date('2026-05-19T10:00:00.000Z');

function createToken(
  overrides: Partial<ConstructorParameters<typeof PasswordResetToken>[0]> = {},
): PasswordResetToken {
  return new PasswordResetToken({
    id: 'reset-token-1',
    tokenHash: 'token-hash',
    userId: 'user-1',
    expiresAt: new Date(baseTime.getTime() + 60 * 60 * 1000),
    usedAt: null,
    ...overrides,
  });
}

describe('PasswordResetToken', () => {
  it('is expired when expiresAt is before now', () => {
    const token = createToken({ expiresAt: new Date(baseTime.getTime() - 1) });

    expect(token.isExpired(baseTime)).toBe(true);
  });

  it('is not expired when expiresAt is equal to now', () => {
    const token = createToken({ expiresAt: baseTime });

    expect(token.isExpired(baseTime)).toBe(false);
  });

  it('is used when usedAt is present', () => {
    const token = createToken({ usedAt: baseTime });

    expect(token.isUsed()).toBe(true);
  });

  it('is valid only when unused and unexpired', () => {
    expect(createToken().isValid(baseTime)).toBe(true);
    expect(createToken({ usedAt: baseTime }).isValid(baseTime)).toBe(false);
    expect(
      createToken({ expiresAt: new Date(baseTime.getTime() - 1) }).isValid(baseTime),
    ).toBe(false);
  });
});
