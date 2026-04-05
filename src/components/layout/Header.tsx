'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'

export default function Header() {
  const { session, logout } = useAuthStore()
  const isPro = session?.plan === 'pro' || session?.plan === 'admin'
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('mw_theme') as 'dark' | 'light' | null
    if (saved) {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('mw_theme', next)
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 h-14 bg-bg2 border-b border-b-1"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg leading-none select-none"
          style={{ background: 'var(--ac)', color: 'var(--bg)' }}
        >
          〜
        </div>
        <div className="font-black text-base tracking-tight">
          <span className="text-tx">موجة</span>{' '}
          <em className="text-ac not-italic">الخبر</em>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">

        {/* Live indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gr"
          style={{ border: '1px solid rgba(0,212,122,0.3)', background: 'rgba(0,212,122,0.05)' }}
        >
          <span className="live-dot" />
          LIVE
        </div>

        {/* Plan badge */}
        {isPro ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-ac text-xs font-bold"
            style={{ background: 'var(--ac2)', border: '1px solid rgba(0,229,255,0.2)' }}
          >
            <span>⭐ Pro — {session?.name}</span>
            <button
              onClick={logout}
              className="text-xs ml-1"
              style={{ background: 'none', border: 'none', color: 'var(--rd)', opacity: 0.7 }}
              title="تسجيل الخروج"
            >
              ✕
            </button>
          </div>
        ) : (
          
            href="/subscribe"
            className="px-3 py-1.5 rounded-lg text-ac text-xs font-bold transition-all duration-200"
            style={{ border: '1px solid var(--ac)' }}
          >
            اشترك ⭐
          </a>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg text-tx-3 transition-all flex items-center justify-center text-sm"
          style={{ border: '1px solid var(--b2)' }}
          title={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Admin button */}
        
          href="/admin"
          className="w-8 h-8 rounded-lg text-tx-3 transition-all flex items-center justify-center text-sm"
          style={{ border: '1px solid var(--b2)' }}
          title="لوحة الأدمن"
        >
          🛡️
        </a>
      </div>
    </header>
  )
}
