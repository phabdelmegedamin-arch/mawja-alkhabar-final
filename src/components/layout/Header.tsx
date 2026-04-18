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
      className="sticky top-0 z-50 flex items-center justify-between px-5 md:px-6"
      style={{
        height: '50px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--b1)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div
          style={{
            width: '26px', height: '26px',
            background: 'var(--tx)',
            borderRadius: '7px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1 10 Q3.5 5 6.5 6.5 Q9.5 8 12 2" stroke="var(--bg)" strokeWidth="1.7" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--tx)' }}>
          موجة الخبر
        </span>
      </div>

      {/* Center — live badge */}
      <div
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1"
        style={{
          fontSize: '11px', fontWeight: 500,
          color: 'var(--gr)',
          background: 'var(--gr2)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '5px',
        }}
      >
        <span className="live-dot" />
        مباشر
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {isPro ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5"
            style={{
              background: 'var(--ac2)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 'var(--r)',
              fontSize: '12px', color: 'var(--ac)',
            }}
          >
            <span style={{ fontWeight: 500 }}>Pro — {session?.name}</span>
            <button
              onClick={logout}
              style={{ background: 'none', border: 'none', color: 'var(--rd)', opacity: 0.6, cursor: 'pointer', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <a
              href="/login"
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--r)',
                fontSize: '12px', fontWeight: 500,
                color: 'var(--t2)',
                border: '1px solid var(--b2)',
                background: 'transparent',
              }}
            >
              دخول
            </a>
            <a
              href="/subscribe"
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--r)',
                fontSize: '12px', fontWeight: 500,
                color: 'var(--ac)',
                border: '1px solid rgba(59,130,246,0.35)',
                background: 'var(--ac2)',
              }}
            >
              Pro ↑
            </a>
          </div>
        )}

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'وضع فاتح' : 'وضع داكن'}
          style={{
            width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            border: '1px solid var(--b2)',
            borderRadius: 'var(--r)',
            color: 'var(--t2)',
            fontSize: '13px',
          }}
        >
          {theme === 'dark' ? '○' : '●'}
        </button>

        <a
          href="/admin"
          title="لوحة الأدمن"
          style={{
            width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            border: '1px solid var(--b2)',
            borderRadius: 'var(--r)',
            color: 'var(--t2)',
            fontSize: '11px', fontWeight: 500,
            fontFamily: 'var(--mono)',
          }}
        >
          /A
        </a>
      </div>
    </header>
  )
}
