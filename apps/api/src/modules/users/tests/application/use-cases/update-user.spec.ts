import { describe, expect, it } from 'vitest';

import { UpdateUser } from '../../../application/use-cases/update-user.use-case';
import {
  ForbiddenError,
  LastAdminError,
  UserNotFoundError,
} from '../../../domain/errors';
import { Role } from '../../../domain/role';
import { FakeAuditLogger } from '../../doubles/fake-audit-logger';
import { FakeClock } from '../../doubles/fake-clock';
import { FakeUserRepository } from '../../doubles/fake-user-repository';
import { baseTime, createUser } from './test-user.factory';

function setup(): {
  auditLogger: FakeAuditLogger;
  updateUser: UpdateUser;
  users: FakeUserRepository;
} {
  const users = new FakeUserRepository();
  const auditLogger = new FakeAuditLogger();
  const clock = new FakeClock(baseTime);

  return {
    auditLogger,
    updateUser: new UpdateUser(users, auditLogger, clock),
    users,
  };
}

describe('UpdateUser', () => {
  it('Admin changes role of non-last-admin succeeds', async () => {
    const { updateUser, users } = setup();
    users.seed(createUser({ id: 'admin-1', role: Role.ADMIN }));
    users.seed(createUser({ id: 'admin-2', role: Role.ADMIN }));

    const result = await updateUser.execute(
      { userId: 'admin-1', role: Role.EDITOR },
      'actor-1',
      Role.ADMIN,
    );

    expect(result.role).toBe(Role.EDITOR);
    await expect(users.countByRole(Role.ADMIN)).resolves.toBe(1);
  });

  it('Admin changes last Admin role throws LastAdminError', async () => {
    const { updateUser, users } = setup();
    users.seed(createUser({ id: 'admin-1', role: Role.ADMIN }));

    await expect(
      updateUser.execute({ userId: 'admin-1', role: Role.EDITOR }, 'actor-1', Role.ADMIN),
    ).rejects.toThrow(LastAdminError);
  });

  it('Admin changes name succeeds', async () => {
    const { updateUser, users } = setup();
    users.seed(createUser({ id: 'user-1', name: 'Old Name' }));

    const result = await updateUser.execute(
      { userId: 'user-1', name: 'New Name' },
      'actor-1',
      Role.ADMIN,
    );

    expect(result.name).toBe('New Name');
    await expect(users.findById('user-1')).resolves.toMatchObject({ name: 'New Name' });
  });

  it('Target not found throws UserNotFoundError', async () => {
    const { updateUser } = setup();

    await expect(
      updateUser.execute({ userId: 'missing-user', name: 'New Name' }, 'actor-1', Role.ADMIN),
    ).rejects.toThrow(UserNotFoundError);
  });

  it('auditLogger.log is called with action user.update', async () => {
    const { auditLogger, updateUser, users } = setup();
    users.seed(createUser({ id: 'user-1' }));

    await updateUser.execute({ userId: 'user-1', name: 'New Name' }, 'actor-1', Role.ADMIN);

    expect(auditLogger.logCalls).toEqual([
      {
        action: 'user.update',
        actorId: 'actor-1',
        targetId: 'user-1',
        occurredAt: baseTime,
      },
    ]);
  });

  it('Editor actor throws ForbiddenError', async () => {
    const { updateUser } = setup();

    await expect(
      updateUser.execute({ userId: 'user-1', name: 'New Name' }, 'editor-1', Role.EDITOR),
    ).rejects.toThrow(ForbiddenError);
  });
});
