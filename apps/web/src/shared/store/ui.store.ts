import { create } from 'zustand';

type UiState = {
  nav: { drawerOpen: boolean };
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  nav: { drawerOpen: false },
  openDrawer: () => {
    set((state) => ({ nav: { ...state.nav, drawerOpen: true } }));
  },
  closeDrawer: () => {
    set((state) => ({ nav: { ...state.nav, drawerOpen: false } }));
  },
}));
