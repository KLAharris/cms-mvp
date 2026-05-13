import { Email } from '../../../domain/email';
import { Role } from '../../../domain/role';
import { User } from '../../../domain/user';

export const baseTime = new Date('2026-05-11T10:00:00.000Z');

export function createUser(overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User {
  return new User({
    id: 'user-1',
    email: Email.create('editor@example.com'),
    name: 'Editor User',
    passwordHash: 'hashed:correct-password',
    role: Role.EDITOR,
    status: 'active',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    inviteTokenHash: null,
    inviteExpiresAt: null,
    createdAt: baseTime,
    ...overrides,
  });
}
