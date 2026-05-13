import { describe, expect, it } from 'vitest';

import { ListUsers } from '../../../application/use-cases/list-users.use-case';
import { ForbiddenError } from '../../../domain/errors';
import { Role } from '../../../domain/role';
import { FakeUserRepository } from '../../doubles/fake-user-repository';
import { baseTime, createUser } from './test-user.factory';

function setup(): { listUsers: ListUsers; users: FakeUserRepository } {
  const users = new FakeUserRepository();
  return { listUsers: new ListUsers(users), users };
}

describe('ListUsers', () => {
  it('Admin actor returns paged list', async () => {
    const { listUsers, users } = setup();
    users.seed(createUser({ id: 'user-1', email: createUser().email }));
    users.seed(
      createUser({
        id: 'user-2',
        email: createUser({ email: createUser().email }).email,
        name: 'Second User',
        role: Role.AUTHOR,
        createdAt: new Date(baseTime.getTime() + 1),
      }),
    );

    const result = await listUsers.execute({ page: 1, pageSize: 1 }, 'admin-1', Role.ADMIN);

    expect(result).toEqual({
      users: [
        {
          id: 'user-1',
          name: 'Editor User',
          email: 'editor@example.com',
          role: Role.EDITOR,
          status: 'active',
          lastLoginAt: null,
          createdAt: baseTime,
        },
      ],
      total: 2,
      page: 1,
      pageSize: 1,
    });
  });

  it('Editor actor throws ForbiddenError', async () => {
    const { listUsers } = setup();

    await expect(listUsers.execute({}, 'editor-1', Role.EDITOR)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('Author actor throws ForbiddenError', async () => {
    const { listUsers } = setup();

    await expect(listUsers.execute({}, 'author-1', Role.AUTHOR)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('Empty results returns total 0 and empty array', async () => {
    const { listUsers } = setup();

    const result = await listUsers.execute({}, 'admin-1', Role.ADMIN);

    expect(result).toEqual({
      users: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });
});
