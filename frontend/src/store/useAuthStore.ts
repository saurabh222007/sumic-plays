import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isGuest: boolean;
  geminiApiKey: string | null;
  loginAsGuest: () => void;
  loginWithKey: (key: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isGuest: false,
      geminiApiKey: null,
      loginAsGuest: () => set({ isGuest: true, geminiApiKey: null }),
      loginWithKey: (key) => set({ isGuest: false, geminiApiKey: key }),
      logout: () => set({ isGuest: false, geminiApiKey: null }),
    }),
    {
      name: 'sumic-auth-storage',
    }
  )
);
