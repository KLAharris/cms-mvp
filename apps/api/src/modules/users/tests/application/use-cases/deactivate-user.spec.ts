import { describe, expect, it } from 'vitest';

import { DeactivateUser } from '../../../application/use-cases/deactivate-user.use-case';
import {
  AlreadyDeactivatedError,
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
  deactivateUser: DeactivateUser;
  users: FakeUserRepository;
} {
  const users = new FakeUserRepository();
  const auditLogger = new FakeAuditLogger();
  const clock = new FakeClock(baseTime);

  return {
    auditLogger,
    deactivateUser: new DeactivateUser(users, auditLogger, clock),
    users,
  };
}

describe('DeactivateUser', () => {
  it('Admin deactivates active user and sets status deactivated', async () => {
    const { deactivateUser, users } = setup();
    users.seed(createUser({ id: 'user-1', status: 'active' }));

    await deactivateUser.execute({ userId: 'user-1' }, 'actor-1', Role.ADMIN);

    await expect(users.findById('user-1')).resolves.toMatchObject({
      status: 'deactivated',
    });
  });

  it('Admin deactivates last Admin throws LastAdminError', async () => {
    const { deactivateUser, users } = setup();
    users.seed(createUser({ id: 'admin-1', role: Role.ADMIN }));

    await expect(
      deactivateUser.execute({ userId: 'admin-1' }, 'actor-1', Role.ADMIN),
    ).rejects.toThrow(LastAdminError);
  });

  it('Admin deactivates already-deactivated user throws AlreadyDeactivatedError', async () => {
    const { deactivateUser, users } = setup();
    users.seed(createUser({ id: 'user-1', status: 'deactivated' }));

    await expect(
      deactivateUser.execute({ userId: 'user-1' }, 'actor-1', Role.ADMIN),
    ).rejects.toThrow(AlreadyDeactivatedError);
  });

  it('Target not found throws UserNotFoundError', async () => {
    const { deactivateUser } = setup();

    await expect(
      deactivateUser.execute({ userId: 'missing-user' }, 'actor-1', Role.ADMIN),
    ).rejects.toThrow(UserNotFoundError);
  });

  it('auditLogger.log is called with action user.deactivate', async () => {
    const { auditLogger, deactivateUser, users } = setup();
    users.seed(createUser({ id: 'user-1' }));

    await deactivateUser.execute({ userId: 'user-1' }, 'actor-1', Role.ADMIN);

    expect(auditLogger.logCalls).toEqual([
      {
        action: 'user.deactivate',
        actorId: 'actor-1',
        targetId: 'user-1',
        occurredAt: baseTime,
      },
    ]);
  });

  it('Editor actor throws ForbiddenError', async () => {
    const { deactivateUser } = setup();

    await expect(
      deactivateUser.execute({ userId: 'user-1' }, 'editor-1', Role.EDITOR),
    ).rejects.toThrow(ForbiddenError);
  });
});
