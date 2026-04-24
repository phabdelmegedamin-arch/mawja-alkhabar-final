'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/',          label: 'التحليل',   icon: '◉' },
  { href: '/news',      label: 'الأخبار',   icon: '◎' },
  { href: '/watchlist', label: 'المتابعة',  icon: '☆' },
  { href: '/history',   label: 'السجل',     icon: '☰' },
  { href: '/portfolio', label: 'المحفظة',   icon: '▣' },
]

function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-label="موجة الخبر">
      <circle cx="8" cy="22" r="3.2" fill="var(--ac)" />
      <path d="M 14 22 Q 18 14, 22 22 T 30 22" stroke="var(--tx)" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.22" />
      <path d="M 14 22 Q 18 16, 22 22 T 30 22" stroke="var(--tx)" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M 14 22 Q 18 18, 22 22 T 30 22" stroke="var(--tx)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default function Header() {
  const pathname = usePathname()
  const router   = useRouter()
  const { session, logout } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [theme,   setTheme]   = useState<'light'|'dark'>('light')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = (localStorage.getItem('mw-theme') as 'light'|'dark') || 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('mw-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(244, 239, 230, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--b1)',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
          <Logo size={32} />
          <div className="hidden sm:flex flex-col leading-none">
            <span
              className="font-semibold text-[15px]"
              style={{ color: 'var(--tx)', letterSpacing: '-0.01em' }}
            >
              موجة الخبر
            </span>
            <span
              className="text-[9px] mt-0.5 uppercase tracking-[0.15em]"
              style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
            >
              News Wave
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 mr-6">
          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded transition-colors text-[13px]"
                style={{
                  color:       active ? 'var(--tx)' : 'var(--t2)',
                  background:  active ? 'var(--bg3)' : 'transparent',
                  fontWeight:  active ? 500 : 400,
                }}
              >
                <span className="ml-1 text-[11px] opacity-60">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1.5">

          {/* Support */}
          <Link
            href="/support"
            title="الدعم الفني"
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg3)] transition-colors"
            style={{ color: 'var(--t2)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="17" r="0.4" fill="currentColor" />
            </svg>
          </Link>

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg3)] transition-colors"
              style={{ color: 'var(--t2)' }}
            >
              {theme === 'light' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
                </svg>
              )}
            </button>
          )}

          {/* Admin link (shown if admin) */}
          {session?.plan === 'admin' && (
            <Link
              href="/admin/dashboard"
              title="لوحة الأدمن"
              className="hidden sm:flex w-8 h-8 items-center justify-center rounded hover:bg-[var(--bg3)] transition-colors"
              style={{ color: 'var(--ac)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </Link>
          )}

          {/* User chip */}
          {session ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded border hover:bg-[var(--bg3)] transition-colors"
                style={{ borderColor: 'var(--b2)' }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold"
                  style={{
                    background: session.plan === 'admin' ? 'var(--tx)' : 'var(--ac)',
                    color: session.plan === 'admin' ? 'var(--bg)' : '#fff',
                  }}
                >
                  {session.name?.charAt(0) || '?'}
                </div>
                <span className="hidden sm:block text-[12px]" style={{ color: 'var(--tx)' }}>
                  {session.name}
                </span>
                {session.plan === 'pro' && (
                  <span className="hidden sm:inline text-[9px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--ac2)', color: 'var(--ac)' }}>
                    PRO
                  </span>
                )}
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    className="absolute left-0 mt-1.5 w-44 rounded-lg shadow-lg z-40 overflow-hidden animate-slide-up"
                    style={{
                      background: '#fff',
                      border: '1px solid var(--b2)',
                      boxShadow: '0 4px 16px rgba(15,15,15,0.08)',
                    }}
                  >
                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-[var(--bg3)] transition-colors"
                      style={{ color: 'var(--tx)' }}
                    >
                      <span>الحساب</span>
                    </Link>
                    <Link
                      href="/support"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-[var(--bg3)] transition-colors"
                      style={{ color: 'var(--tx)' }}
                    >
                      <span>الدعم الفني</span>
                    </Link>
                    <div style={{ borderTop: '1px solid var(--b1)' }} />
                    <button
                      onClick={() => { logout(); setMenuOpen(false); router.push('/') }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-[var(--rd2)] transition-colors text-right"
                      style={{ color: 'var(--rd)' }}
                    >
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded text-[13px] font-medium transition-colors"
              style={{
                background: 'var(--tx)',
                color:      'var(--bg)',
              }}
            >
              دخول
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
