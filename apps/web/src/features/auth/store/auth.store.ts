import { create } from 'zustand';

const AUTH_STORAGE_KEY = 'cms.auth';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  name?: string;
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (session: { accessToken: string; user: AuthUser }) => void;
  logout: () => void;
};

type PersistedAuthState = {
  state?: {
    accessToken?: string | null;
    user?: AuthUser | null;
  };
};

function readPersistedAuth(): Pick<AuthState, 'accessToken' | 'user' | 'isAuthenticated'> {
  if (typeof window === 'undefined') {
    return { accessToken: null, user: null, isAuthenticated: false };
  }

  const rawAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (rawAuth === null) {
    return { accessToken: null, user: null, isAuthenticated: false };
  }

  try {
    const parsed = JSON.parse(rawAuth) as PersistedAuthState;
    const accessToken = parsed.state?.accessToken ?? null;
    const user = parsed.state?.user ?? null;

    return {
      accessToken,
      user,
      isAuthenticated: accessToken !== null && user !== null,
    };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return { accessToken: null, user: null, isAuthenticated: false };
  }
}

function persistAuth(accessToken: string, user: AuthUser): void {
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ state: { accessToken, user }, version: 0 }),
  );
}

export const useAuthStore = create<AuthState>((set) => ({
  ...readPersistedAuth(),
  login: ({ accessToken, user }) => {
    persistAuth(accessToken, user);
    set({ accessToken, user, isAuthenticated: true });
  },
  logout: () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    set({ accessToken: null, user: null, isAuthenticated: false });
  },
}));
