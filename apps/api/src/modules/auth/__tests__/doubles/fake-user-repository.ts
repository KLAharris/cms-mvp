import { Email } from '../../domain/email';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';
import {
  PagedUsers,
  UserRepository,
  UserSearchCriteria,
} from '../../application/ports/out/user-repository.port';

export class FakeUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  seed(user: User): void {
    this.users.set(user.email.value, user);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(
      Array.from(this.users.values()).find((user) => user.id === id) ?? null,
    );
  }

  findByEmail(email: Email): Promise<User | null> {
    return Promise.resolve(this.users.get(email.value) ?? null);
  }

  findMany(criteria: UserSearchCriteria): Promise<PagedUsers> {
    const page = criteria.page ?? 1;
    const pageSize = criteria.pageSize ?? 25;
    const matchingUsers = Array.from(this.users.values()).filter((user) => {
      if (criteria.role !== undefined && user.role !== criteria.role) {
        return false;
      }

      if (criteria.status !== undefined && user.status !== criteria.status) {
        return false;
      }

      return true;
    });

    return Promise.resolve({
      users: matchingUsers.slice((page - 1) * pageSize, page * pageSize),
      total: matchingUsers.length,
    });
  }

  findInvitedByTokenHash(sha256Hash: string): Promise<User | null> {
    return Promise.resolve(
      Array.from(this.users.values()).find(
        (user) => user.status === 'invited' && user.inviteTokenHash === sha256Hash,
      ) ?? null,
    );
  }

  countByRole(role: Role): Promise<number> {
    return Promise.resolve(
      Array.from(this.users.values()).filter((user) => user.role === role).length,
    );
  }

  save(user: User): Promise<void> {
    this.users.set(user.email.value, user);
    return Promise.resolve();
  }
}
