'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserSession } from '@/types'

interface AuthState {
  session:   UserSession | null
  isLoading: boolean

  setSession: (s: UserSession | null) => void
  setLoading: (b: boolean) => void
  logout:     () => void
  isPro:      () => boolean
  isAdmin:    () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session:   null,
      isLoading: false,

      setSession: (session) => set({ session }),
      setLoading: (b)       => set({ isLoading: b }),
      logout: () => set({ session: null }),

      isPro:  () => {
        const p = get().session?.plan
        return p === 'pro' || p === 'admin'
      },
      isAdmin: () => get().session?.plan === 'admin',
    }),
    {
      name: 'mw-auth',
      partialize: (s) => ({ session: s.session }),
    }
  )
)
