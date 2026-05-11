import { describe, expect, it } from 'vitest';

import { Email } from '../../domain/email';
import { DomainError } from '../../domain/errors';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';

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

describe('User', () => {
  it('constructs with valid inputs', () => {
    const user = createUser();

    expect(user.id).toBe('user-1');
    expect(user.email.value).toBe('editor@example.com');
    expect(user.role).toBe(Role.EDITOR);
    expect(user.status).toBe('active');
  });

  it('rejects empty identity and password hash values', () => {
    expect(() => createUser({ id: '' })).toThrow(DomainError);
    expect(() => createUser({ passwordHash: '' })).toThrow(DomainError);
  });

  it('sets failedLoginWindowStartedAt on the first failed login', () => {
    const failed = createUser().recordFailedLogin(baseTime);

    expect(failed.failedLoginAttempts).toBe(1);
    expect(failed.failedLoginWindowStartedAt).toEqual(baseTime);
  });

  it('increments attempts inside the window and keeps the same window start', () => {
    const first = createUser().recordFailedLogin(baseTime);
    const second = first.recordFailedLogin(new Date(baseTime.getTime() + 5 * 60 * 1000));

    expect(second.failedLoginAttempts).toBe(2);
    expect(second.failedLoginWindowStartedAt).toEqual(baseTime);
  });

  it('resets to one attempt and starts a new window after the window passes', () => {
    const first = createUser().recordFailedLogin(baseTime);
    const afterWindow = new Date(baseTime.getTime() + 10 * 60 * 1000 + 1);
    const second = first.recordFailedLogin(afterWindow);

    expect(second.failedLoginAttempts).toBe(1);
    expect(second.failedLoginWindowStartedAt).toEqual(afterWindow);
    expect(second.lockedUntil).toBeNull();
  });

  it('locks for 15 minutes on the fifth failed login inside the same window', () => {
    const fifthFailureTime = new Date(baseTime.getTime() + 4 * 60 * 1000);
    const user = [0, 1, 2, 3, 4].reduce(
      (current, minutes) =>
        current.recordFailedLogin(new Date(baseTime.getTime() + minutes * 60 * 1000)),
      createUser(),
    );

    expect(user.failedLoginAttempts).toBe(5);
    expect(user.failedLoginWindowStartedAt).toEqual(baseTime);
    expect(user.lockedUntil).toEqual(
      new Date(fifthFailureTime.getTime() + 15 * 60 * 1000),
    );
    expect(user.status).toBe('locked');
  });

  it('does not lock when five failed logins are spread beyond the window', () => {
    const user = [0, 11, 22, 33, 44].reduce(
      (current, minutes) =>
        current.recordFailedLogin(new Date(baseTime.getTime() + minutes * 60 * 1000)),
      createUser(),
    );

    expect(user.failedLoginAttempts).toBe(1);
    expect(user.lockedUntil).toBeNull();
    expect(user.status).toBe('active');
  });

  it('successful login resets failed attempts, failed window, and lockout', () => {
    const locked = [0, 1, 2, 3, 4].reduce(
      (current, minutes) =>
        current.recordFailedLogin(new Date(baseTime.getTime() + minutes * 60 * 1000)),
      createUser(),
    );

    const successful = locked.recordSuccessfulLogin(
      new Date(baseTime.getTime() + 20 * 60 * 1000),
    );

    expect(successful.failedLoginAttempts).toBe(0);
    expect(successful.failedLoginWindowStartedAt).toBeNull();
    expect(successful.lockedUntil).toBeNull();
    expect(successful.status).toBe('active');
  });

  it('isLocked returns true when lockedUntil is in the future', () => {
    const user = createUser({
      status: 'locked',
      lockedUntil: new Date(baseTime.getTime() + 1),
    });

    expect(user.isLocked(baseTime)).toBe(true);
  });

  it('isLocked returns false when lockedUntil is in the past', () => {
    const user = createUser({
      status: 'locked',
      lockedUntil: new Date(baseTime.getTime() - 1),
    });

    expect(user.isLocked(baseTime)).toBe(false);
  });

  it('lockout expires after 15 minutes', () => {
    const locked = [0, 1, 2, 3, 4].reduce(
      (current, minutes) =>
        current.recordFailedLogin(new Date(baseTime.getTime() + minutes * 60 * 1000)),
      createUser(),
    );

    expect(locked.isLocked(new Date(baseTime.getTime() + 19 * 60 * 1000 + 1))).toBe(false);
  });

  it('starts a fresh failed-login window after lockout expires', () => {
    const locked = [0, 1, 2, 3, 4].reduce(
      (current, minutes) =>
        current.recordFailedLogin(new Date(baseTime.getTime() + minutes * 60 * 1000)),
      createUser(),
    );
    const afterLockout = new Date(baseTime.getTime() + 19 * 60 * 1000 + 1);
    const failedAfterLockout = locked.recordFailedLogin(afterLockout);

    expect(failedAfterLockout.failedLoginAttempts).toBe(1);
    expect(failedAfterLockout.failedLoginWindowStartedAt).toEqual(afterLockout);
    expect(failedAfterLockout.lockedUntil).toBeNull();
    expect(failedAfterLockout.status).toBe('active');
  });

  it('treats a past lockedUntil as expired when recording a failed login', () => {
    const user = createUser({
      status: 'locked',
      failedLoginAttempts: 5,
      failedLoginWindowStartedAt: baseTime,
      lockedUntil: new Date(baseTime.getTime() - 1),
    });

    const failed = user.recordFailedLogin(baseTime);

    expect(failed.failedLoginAttempts).toBe(1);
    expect(failed.failedLoginWindowStartedAt).toEqual(baseTime);
    expect(failed.lockedUntil).toBeNull();
    expect(failed.status).toBe('active');
  });
});
