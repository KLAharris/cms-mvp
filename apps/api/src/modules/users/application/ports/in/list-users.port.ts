import { Role } from '../../../domain/role';

export type UserDto = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'invited' | 'deactivated';
  lastLoginAt: Date | null;
  createdAt: Date;
};

export type ListUsersQuery = {
  page?: number;
  pageSize?: number;
  role?: Role;
  status?: string;
};

export type ListUsersResult = {
  users: UserDto[];
  total: number;
  page: number;
  pageSize: number;
};

export interface ListUsersUseCase {
  execute(
    query: ListUsersQuery,
    actorId: string,
    actorRole: Role,
  ): Promise<ListUsersResult>;
}
