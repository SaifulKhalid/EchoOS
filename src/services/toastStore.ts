import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, action?: Toast['action']) => string;
  error: (message: string) => string;
  info: (message: string) => string;
  warning: (message: string) => string;
}

const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

function generateId(): string {
  return `toast-${crypto.randomUUID().slice(0, 8)}`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateId();
    const duration = toast.duration ?? 4000;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));

    if (duration > 0) {
      const handle = setTimeout(() => {
        timeouts.delete(id);
        get().removeToast(id);
      }, duration);
      timeouts.set(id, handle);
    }
    return id;
  },

  removeToast: (id) => {
    const existing = timeouts.get(id);
    if (existing) {
      clearTimeout(existing);
      timeouts.delete(id);
    }
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
