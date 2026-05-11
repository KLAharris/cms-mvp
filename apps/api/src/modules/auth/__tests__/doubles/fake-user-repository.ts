import { Email } from '../../domain/email';
import { User } from '../../domain/user';
import { UserRepository } from '../../application/ports/out/user-repository.port';

export class FakeUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  seed(user: User): void {
    this.users.set(user.email.value, user);
  }

  async findByEmail(email: Email): Promise<User | null> {
    return this.users.get(email.value) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.email.value, user);
  }
}
