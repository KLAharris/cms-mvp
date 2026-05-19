import { api } from '../../../shared/api/api';
import type {
  InviteUserRequest,
  UpdateUserRequest,
  UserItem,
  UserListResponse,
} from '../types/user.types';

export async function listUsers(params?: {
  page?: number;
  pageSize?: number;
}): Promise<UserListResponse> {
  const response = await api.get<UserListResponse>('/api/admin/users', { params });
  return response.data;
}

export async function inviteUser(data: InviteUserRequest): Promise<UserItem> {
  const response = await api.post<UserItem>('/api/admin/users/invite', data);
  return response.data;
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<UserItem> {
  const response = await api.patch<UserItem>(`/api/admin/users/${id}`, data);
  return response.data;
}

export async function deactivateUser(id: string): Promise<void> {
  await api.delete(`/api/admin/users/${id}`);
}

export async function resendInvite(id: string): Promise<void> {
  await api.post(`/api/admin/users/${id}/resend-invite`);
}
