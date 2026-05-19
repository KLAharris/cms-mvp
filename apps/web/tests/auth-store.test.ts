import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '../src/features/auth/store/auth.store';

const user = {
  id: 'user-1',
  email: 'editor@example.com',
  role: 'editor',
  name: 'Editor One',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('stores the authenticated user and access token on login', () => {
    useAuthStore.getState().login({ accessToken: 'access-token', user });

    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('persists auth state to localStorage for page refreshes', () => {
    useAuthStore.getState().login({ accessToken: 'access-token', user });

    expect(localStorage.getItem('cms.auth')).toBe(
      JSON.stringify({ state: { accessToken: 'access-token', user }, version: 0 }),
    );
  });

  it('clears auth state and persistence on logout', () => {
    useAuthStore.getState().login({ accessToken: 'access-token', user });

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('cms.auth')).toBeNull();
  });
});
