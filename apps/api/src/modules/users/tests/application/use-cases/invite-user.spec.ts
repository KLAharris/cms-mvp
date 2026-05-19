import { createHash } from 'crypto';

import { describe, expect, it } from 'vitest';

import { InviteUser } from '../../../application/use-cases/invite-user.use-case';
import { Email } from '../../../domain/email';
import { ForbiddenError, UserAlreadyExistsError } from '../../../domain/errors';
import { Role } from '../../../domain/role';
import { FakeAuditLogger } from '../../doubles/fake-audit-logger';
import { FakeClock } from '../../doubles/fake-clock';
import { FakeIdGenerator } from '../../doubles/fake-id-generator';
import { FakeNotificationService } from '../../doubles/fake-notification-service';
import { FakePasswordHasher } from '../../doubles/fake-password-hasher';
import { FakeUserRepository } from '../../doubles/fake-user-repository';
import { baseTime, createUser } from './test-user.factory';

function setup(): {
  auditLogger: FakeAuditLogger;
  inviteUser: InviteUser;
  notifications: FakeNotificationService;
  users: FakeUserRepository;
} {
  const users = new FakeUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const notifications = new FakeNotificationService();
  const clock = new FakeClock(baseTime);
  const idGenerator = new FakeIdGenerator(['raw-token-1', 'user-1']);
  const auditLogger = new FakeAuditLogger();
  const inviteUser = new InviteUser(
    users,
    passwordHasher,
    notifications,
    clock,
    idGenerator,
    auditLogger,
  );

  return { auditLogger, inviteUser, notifications, users };
}

describe('InviteUser', () => {
  it('Admin invites valid email, name, and role and saves invited user', async () => {
    const { inviteUser, users } = setup();

    await inviteUser.execute(
      { email: 'Author@Example.com', name: 'Author User', role: Role.AUTHOR },
      'admin-1',
      Role.ADMIN,
    );

    const saved = await users.findByEmail(Email.create('author@example.com'));
    expect(saved?.id).toBe('user-1');
    expect(saved?.name).toBe('Author User');
    expect(saved?.role).toBe(Role.AUTHOR);
    expect(saved?.status).toBe('invited');
  });

  it('Duplicate email throws UserAlreadyExistsError', async () => {
    const { inviteUser, users } = setup();
    users.seed(createUser({ email: Email.create('author@example.com') }));

    await expect(
      inviteUser.execute(
        { email: 'author@example.com', name: 'Author User', role: Role.AUTHOR },
        'admin-1',
        Role.ADMIN,
      ),
    ).rejects.toThrow(UserAlreadyExistsError);
  });

  it('stores SHA-256 hash in repo and sends raw token to notifications', async () => {
    const { inviteUser, notifications, users } = setup();
    const expectedHash = createHash('sha256').update('raw-token-1').digest('hex');

    await inviteUser.execute(
      { email: 'author@example.com', name: 'Author User', role: Role.AUTHOR },
      'admin-1',
      Role.ADMIN,
    );

    const saved = await users.findInvitedByTokenHash(expectedHash);
    expect(saved?.inviteTokenHash).toBe(expectedHash);
    expect(notifications.sentInvites).toEqual([
      { to: 'author@example.com', token: 'raw-token-1', role: Role.AUTHOR },
    ]);
  });

  it('expiresAt is exactly 7 days from clock.now()', async () => {
    const { inviteUser, users } = setup();

    await inviteUser.execute(
      { email: 'author@example.com', name: 'Author User', role: Role.AUTHOR },
      'admin-1',
      Role.ADMIN,
    );

    const saved = await users.findByEmail(Email.create('author@example.com'));
    expect(saved?.inviteExpiresAt).toEqual(
      new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000),
    );
  });

  it('auditLogger.log is called with action user.invite', async () => {
    const { auditLogger, inviteUser } = setup();

    await inviteUser.execute(
      { email: 'author@example.com', name: 'Author User', role: Role.AUTHOR },
      'admin-1',
      Role.ADMIN,
    );

    expect(auditLogger.logCalls).toEqual([
      {
        action: 'user.invite',
        actorId: 'admin-1',
        targetId: 'user-1',
        occurredAt: baseTime,
      },
    ]);
  });

  it('Editor actor throws ForbiddenError', async () => {
    const { inviteUser } = setup();

    await expect(
      inviteUser.execute(
        { email: 'author@example.com', name: 'Author User', role: Role.AUTHOR },
        'editor-1',
        Role.EDITOR,
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});
