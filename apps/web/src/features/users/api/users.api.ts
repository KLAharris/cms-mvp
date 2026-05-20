import { api } from '../../../shared/api/api';
import type {
  InviteUserRequest,
  UpdateUserRequest,
  UserItem,
  UserListResponse,
} from '../types/user.types';

type UserListEnvelope = {
  data: UserItem[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
};

export async function listUsers(params?: {
  page?: number;
  pageSize?: number;
}): Promise<UserListResponse> {
  const response = await api.get<UserListEnvelope>('/api/admin/users', { params });
  return {
    items: response.data.data,
    total: response.data.pagination.total,
    page: response.data.pagination.page,
    pageSize: response.data.pagination.page_size,
  };
}

export async function inviteUser(data: InviteUserRequest): Promise<void> {
  await api.post('/api/admin/users', data);
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<UserItem> {
  const response = await api.patch<{ data: UserItem }>(`/api/admin/users/${id}`, data);
  return response.data.data;
}

export async function deactivateUser(id: string): Promise<void> {
  await api.post(`/api/admin/users/${id}/deactivate`);
}

export async function resendInvite(id: string): Promise<void> {
  await api.post(`/api/admin/users/${id}/resend-invite`);
}
