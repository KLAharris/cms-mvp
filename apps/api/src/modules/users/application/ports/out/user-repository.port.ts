import { Email } from '../../../domain/email';
import { Role } from '../../../domain/role';
import { User } from '../../../domain/user';

export type UserSearchCriteria = {
  page?: number;
  pageSize?: number;
  role?: Role;
  status?: 'active' | 'invited' | 'deactivated';
};

export type PagedUsers = {
  users: User[];
  total: number;
};

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findMany(criteria: UserSearchCriteria): Promise<PagedUsers>;
  findInvitedByTokenHash(sha256Hash: string): Promise<User | null>;
  countByRole(role: Role): Promise<number>;
  save(user: User): Promise<void>;
}
