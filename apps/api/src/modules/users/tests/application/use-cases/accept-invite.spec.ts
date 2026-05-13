import { createHash } from 'crypto';

import { describe, expect, it } from 'vitest';

import { AcceptInvite } from '../../../application/use-cases/accept-invite.use-case';
import { UserRepository } from '../../../application/ports/out/user-repository.port';
import {
  InviteExpiredError,
  InvalidTransitionError,
  UserNotFoundError,
  WeakPasswordError,
} from '../../../domain/errors';
import { Role } from '../../../domain/role';
import { User } from '../../../domain/user';
import { FakeClock } from '../../doubles/fake-clock';
import { FakePasswordHasher } from '../../doubles/fake-password-hasher';
import { FakeUserRepository } from '../../doubles/fake-user-repository';
import { baseTime, createUser } from './test-user.factory';

const token = 'raw-token-1';
const tokenHash = createHash('sha256').update(token).digest('hex');

function setup(user?: User, repo?: UserRepository): {
  acceptInvite: AcceptInvite;
  users: FakeUserRepository;
} {
  const users = new FakeUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const clock = new FakeClock(baseTime);

  if (user !== undefined) {
    users.seed(user);
  }

  return {
    acceptInvite: new AcceptInvite(repo ?? users, passwordHasher, clock),
    users,
  };
}

function createInvited(expiresAt = new Date(baseTime.getTime() + 1)): User {
  return User.createInvited(
    'user-1',
    createUser().email,
    'Invited User',
    Role.AUTHOR,
    tokenHash,
    expiresAt,
  );
}

describe('AcceptInvite', () => {
  it('Valid token and password activates user and updates passwordHash', async () => {
    const { acceptInvite, users } = setup(createInvited());

    await acceptInvite.execute({ token, password: 'new-password1' });

    const saved = await users.findById('user-1');
    expect(saved?.status).toBe('active');
    expect(saved?.passwordHash).toBe('hashed:new-password1');
    expect(saved?.inviteTokenHash).toBeNull();
    expect(saved?.inviteExpiresAt).toBeNull();
  });

  it('Unknown token throws UserNotFoundError', async () => {
    const { acceptInvite } = setup();

    await expect(
      acceptInvite.execute({ token: 'unknown-token', password: 'new-password1' }),
    ).rejects.toThrow(UserNotFoundError);
  });

  it('Expired invite throws InviteExpiredError', async () => {
    const { acceptInvite } = setup(createInvited(new Date(baseTime.getTime() - 1)));

    await expect(
      acceptInvite.execute({ token, password: 'new-password1' }),
    ).rejects.toThrow(InviteExpiredError);
  });

  it('Already active user throws InvalidTransitionError', async () => {
    const activeUser = createUser({
      status: 'active',
      inviteTokenHash: tokenHash,
      inviteExpiresAt: new Date(baseTime.getTime() + 1),
    });
    class ActiveTokenRepository
      extends FakeUserRepository
      implements UserRepository
    {
      override findInvitedByTokenHash(): Promise<User | null> {
        return Promise.resolve(activeUser);
      }
    }

    const repo = new ActiveTokenRepository();
    const { acceptInvite } = setup(undefined, repo);

    await expect(
      acceptInvite.execute({ token, password: 'new-password1' }),
    ).rejects.toThrow(InvalidTransitionError);
  });

  it('Password shorter than 12 chars throws WeakPasswordError', async () => {
    const { acceptInvite } = setup(createInvited());

    await expect(
      acceptInvite.execute({ token, password: 'short1' }),
    ).rejects.toThrow(WeakPasswordError);
  });

  it('Password with no letters throws WeakPasswordError', async () => {
    const { acceptInvite } = setup(createInvited());

    await expect(
      acceptInvite.execute({ token, password: '123456789012' }),
    ).rejects.toThrow(WeakPasswordError);
  });

  it('Password with no digits throws WeakPasswordError', async () => {
    const { acceptInvite } = setup(createInvited());

    await expect(
      acceptInvite.execute({ token, password: 'new-password' }),
    ).rejects.toThrow(WeakPasswordError);
  });

  it('Valid password with 12+ chars, a letter, and a digit succeeds', async () => {
    const { acceptInvite, users } = setup(createInvited());

    await acceptInvite.execute({ token, password: 'valid-pass-1' });

    const saved = await users.findById('user-1');
    expect(saved?.status).toBe('active');
    expect(saved?.passwordHash).toBe('hashed:valid-pass-1');
  });
});
