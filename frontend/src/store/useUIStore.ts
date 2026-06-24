import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  timeout?: number;
}

interface UIState {
  toasts: ToastItem[];
  addToast: (message: string, timeout?: number) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  addToast: (message: string, timeout = 4000) => {
    const id = `${Date.now()}-${Math.floor(Math.random()*10000)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, timeout }] }));
    if (timeout > 0) setTimeout(() => get().removeToast(id), timeout);
  },
  removeToast: (id: string) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

export default useUIStore;
