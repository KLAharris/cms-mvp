import { describe, expect, it } from 'vitest';

import { LastAdminError } from '../errors';
import { Role } from '../role';
import { LastAdminGuard } from './last-admin.guard';

function createUser(role: Role): { role: Role } {
  return { role };
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
