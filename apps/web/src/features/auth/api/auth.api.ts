import { api } from '../../../shared/api/api';
import { AuthUser } from '../store/auth.store';

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  password: string;
};

export async function loginWithPassword(
  request: LoginRequest,
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/api/admin/auth/login', request);
  return response.data;
}

export async function forgotPassword(
  request: ForgotPasswordRequest,
): Promise<void> {
  await api.post('/api/admin/auth/forgot-password', request);
}

export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
  await api.post('/api/admin/auth/reset-password', request);
}
