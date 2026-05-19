import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'cms.themeMode';

function readPersistedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export type SnackSeverity = 'success' | 'error' | 'info';

interface SnackState {
  open: boolean;
  message: string;
  severity: SnackSeverity;
}

type UiState = {
  nav: { drawerOpen: boolean };
  themeMode: ThemeMode;
  snack: SnackState;
  openDrawer: () => void;
  closeDrawer: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  showSnack: (message: string, severity?: SnackSeverity) => void;
  hideSnack: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  nav: { drawerOpen: false },
  themeMode: readPersistedTheme(),
  snack: { open: false, message: '', severity: 'success' },

  openDrawer: () => {
    set((state) => ({ nav: { ...state.nav, drawerOpen: true } }));
  },
  closeDrawer: () => {
    set((state) => ({ nav: { ...state.nav, drawerOpen: false } }));
  },
  setThemeMode: (mode) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
    set({ themeMode: mode });
  },
  showSnack: (message, severity = 'success') => {
    set({ snack: { open: true, message, severity } });
  },
  hideSnack: () => {
    set((state) => ({ snack: { ...state.snack, open: false } }));
  },
}));
