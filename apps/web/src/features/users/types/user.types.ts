export type UserRole = 'admin' | 'editor' | 'author';
export type UserStatus = 'active' | 'invited' | 'deactivated';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
}

export interface UserListResponse {
  items: UserItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InviteUserRequest {
  email: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  role?: UserRole;
}
