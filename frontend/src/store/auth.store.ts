'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import type { User, LoginResponse } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (data: LoginResponse) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (data: LoginResponse) => {
        Cookies.set('accessToken', data.accessToken, { expires: 1 / 24 });
        Cookies.set('refreshToken', data.refreshToken, { expires: 7 });
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
        });
      },

      clearAuth: () => {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      setUser: (user: User) => set({ user }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
