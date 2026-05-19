import axios from 'axios';

import { useAuthStore } from '../../features/auth/store/auth.store';

const apiBaseUrl =
  (import.meta.env as { readonly VITE_API_URL?: string }).VITE_API_URL ?? '';

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken !== null) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().logout();

      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error instanceof Error ? error : new Error('Request failed'));
  },
);
