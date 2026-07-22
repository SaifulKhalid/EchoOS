import { create } from 'zustand';

/**
 * Lightweight global UI state (Zustand). Kept intentionally small — server
 * state lives in TanStack Query, auth in the AuthProvider. This store is for
 * ephemeral UI concerns like modals and command-palette visibility.
 */
interface UIState {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  activeModal: null,
  openModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),
}));
