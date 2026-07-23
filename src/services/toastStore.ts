import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  /** Optional action label shown as a button (e.g. "Undo"). */
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  /** Convenience helpers */
  success: (message: string, action?: Toast['action']) => string;
  error: (message: string) => string;
  info: (message: string) => string;
  warning: (message: string) => string;
}

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++counter}`;
    const duration = toast.duration ?? 4000;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
    return id;
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  success: (message, action) =>
    get().addToast({ message, variant: 'success', action }),

  error: (message) =>
    get().addToast({ message, variant: 'error', duration: 6000 }),

  info: (message) =>
    get().addToast({ message, variant: 'info' }),

  warning: (message) =>
    get().addToast({ message, variant: 'warning', duration: 5000 }),
}));
