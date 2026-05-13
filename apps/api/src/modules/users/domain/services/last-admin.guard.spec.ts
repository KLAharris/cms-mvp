import { describe, expect, it } from 'vitest';

import { Email } from '../../../auth/domain/email';
import { LastAdminError } from '../../../auth/domain/errors';
import { Role } from '../../../auth/domain/role';
import { User } from '../../../auth/domain/user';
import { LastAdminGuard } from './last-admin.guard';

function createUser(role: Role): User {
  return new User({
    id: 'user-1',
    email: Email.create('admin@example.com'),
    passwordHash: 'hashed:correct-password',
    role,
    status: 'active',
    failedLoginAttempts: 0,
    failedLoginWindowStartedAt: null,
    lockedUntil: null,
    lastLoginAt: null,
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
