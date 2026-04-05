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
    <header className="sticky top-0 z-50 flex items-center justify-between
                       px-4 md:px-6 h-14
                       bg-bg2 border-b border-b-1
                       shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-ac flex items-center justify-center
                        text-bg font-black text-lg leading-none select-none">
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
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1
                        rounded text-xs text-gr border border-gr/30 bg-gr/5">
          <span className="live-dot" />
          LIVE
        </div>

        {/* Plan badge */}
        {isPro ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                          bg-ac/10 border border-ac/20 text-ac text-xs font-bold">
            <span>⭐ Pro — {session?.name}</span>
            <button
              onClick={logout}
              className="text-rd/70 hover:text-rd transition-colors text-xs ml-1"
              title="تسجيل الخروج"
            >
              ✕
            </button>
          </div>
        ) : (
          
            href="/subscribe"
            className="px-3 py-1.5 rounded-lg border border-ac text-ac
                       text-xs font-bold hover:bg-ac hover:text-bg
                       transition-all duration-200"
          >
            اشترك ⭐
          </a>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg border border-b-2 text-tx-3
                     hover:border-ac hover:text-ac transition-all
                     flex items-center justify-center text-sm"
          title={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Admin button */}
        
          href="/admin"
          className="w-8 h-8 rounded-lg border border-b-2 text-tx-3
                     hover:border-ac hover:text-ac transition-all
                     flex items-center justify-center text-sm"
          title="لوحة الأدمن"
        >
          🛡️
        </a>
      </div>
    </header>
  )
}
