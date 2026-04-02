'use client'
import { useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { createClient } from '@/lib/supabase'
import type { UserSession } from '@/types'

export function useAuth() {
  const { session, setSession, setLoading, logout, isPro, isAdmin } = useAuthStore()
  const supabase = createClient()

  // Sync Supabase session on mount
  useEffect(() => {
    setLoading(true)
    supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
      if (sbSession?.user) {
        // fetch profile
        supabase
          .from('profiles')
          .select('username, name, plan, status, expires_at')
          .eq('id', sbSession.user.id)
          .single()
          .then(({ data: profile }) => {
            setSession({
              id:        sbSession.user.id,
              name:      profile?.name ?? profile?.username ?? sbSession.user.email ?? '',
              email:     sbSession.user.email,
              plan:      (profile?.plan as any) ?? 'free',
              token:     sbSession.access_token,
              ts:        Date.now(),
              expiresAt: profile?.expires_at ?? undefined,
            })
          })
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') logout()
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'خطأ في الدخول')
      const s: UserSession = { ...data.data, name: data.data.name ?? username }
      setSession(s)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [setSession, setLoading])

  const register = useCallback(async (payload: {
    name: string; username: string; email: string
    phone: string; password: string; plan: string; amount: number
  }) => {
    const res  = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.data
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
  }, [logout, supabase])

  return { session, isPro: isPro(), isAdmin: isAdmin(), login, register, signOut }
}
