import { describe, expect, it } from 'vitest';

import { LastAdminError } from '../errors';
import { Role } from '../role';
import { Email } from '../email';
import { User } from '../user';
import { LastAdminGuard } from './last-admin.guard';

function createUser(role: Role): User {
  return new User({
    id: 'user-1',
    email: Email.create('admin@example.com'),
    name: 'Admin User',
    passwordHash: 'hashed:correct-password',
    role,
    status: 'active',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    inviteTokenHash: null,
    inviteExpiresAt: null,
    createdAt: new Date('2026-05-11T10:00:00.000Z'),
  });
}

describe('LastAdminGuard', () => {
  it('1 admin targeting that admin throws LastAdminError', () => {
    const targetUser = createUser(Role.ADMIN);

    expect(() => {
      LastAdminGuard.assertNotLastAdmin(1, targetUser);
    }).toThrow(LastAdminError);
  });

  it('2 admins targeting one does not throw', () => {
    const targetUser = createUser(Role.ADMIN);

    expect(() => {
      LastAdminGuard.assertNotLastAdmin(2, targetUser);
    }).not.toThrow();
  });

  it('1 admin targeting a non-admin does not throw', () => {
    const targetUser = createUser(Role.EDITOR);

    expect(() => {
      LastAdminGuard.assertNotLastAdmin(1, targetUser);
    }).not.toThrow();
  });
});
