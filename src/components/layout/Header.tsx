'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useState } from 'react'

const NAV = [
  { href: '/',          label: 'التحليل'   },
  { href: '/history',   label: 'السجل'     },
  { href: '/watchlist', label: 'المتابعة'  },
  { href: '/prices',    label: 'الأسعار'   },
  { href: '/support',   label: 'الدعم'     },
]

function Logo() {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-label="موجة الخبر" className="hdr-logo" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="24" r="3" fill="#F5B71C" />
      <path d="M 16 14 Q 22 24, 16 34" stroke="#0F0F0F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 24 8 Q 34 24, 24 40" stroke="#0F0F0F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M 34 4 Q 46 24, 34 44" stroke="#0F0F0F" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.22" />
    </svg>
  )
}

export default function Header() {
  const pathname = usePathname()
  const router   = useRouter()
  const { session, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(244, 239, 230, 0.96)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* CSS متجاوب — إخفاء قائمة الديسكتوب على الموبايل (تظهر في BottomNav) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hdr-inner    { padding: 22px 48px; gap: 24px; }
        .hdr-nav      { display: flex; align-items: center; gap: 40px; }
        .hdr-tools    { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .hdr-brand-sub{ display: inline; }
        .hdr-tool-icon{ width: 40px; height: 40px; }
        .hdr-en       { display: inline-flex; }
        .hdr-logo     { width: 46px; height: 46px; }
        .hdr-brand-title { font-size: 22px; }

        @media (max-width: 768px) {
          .hdr-inner    { padding: 12px 14px; gap: 8px; }
          .hdr-nav      { display: none; }
          .hdr-brand-sub{ display: none; }
          .hdr-tool-icon{ width: 36px; height: 36px; }
          .hdr-en       { display: none; }
          .hdr-logo     { width: 34px; height: 34px; }
          .hdr-brand-title { font-size: 16px; }
        }
      `}} />

      <div
        className="hdr-inner flex items-center justify-between"
        style={{
          maxWidth: '1320px',
          margin: '0 auto',
        }}
      >
        {/* اللوجو */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          <Logo />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: '5px', minWidth: 0 }}>
            <span
              className="hdr-brand-title"
              style={{
                fontFamily: 'var(--sans)',
                fontWeight: 600,
                color: 'var(--ink)',
                letterSpacing: '-0.015em',
                whiteSpace: 'nowrap',
              }}
            >
              موجة الخبر
            </span>
            <span
              className="hdr-brand-sub"
              style={{
                fontFamily: 'var(--sans-lat)',
                fontSize: '9px',
                fontWeight: 500,
                color: 'var(--muted)',
                letterSpacing: '0.22em',
                whiteSpace: 'nowrap',
              }}
            >
              MAWJA · NEWS SENTIMENT
            </span>
          </div>
        </Link>

        {/* قائمة الديسكتوب — تخفى على الموبايل */}
        <nav className="hdr-nav">
          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  position: 'relative',
                  fontSize: '15px',
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  padding: '4px 0',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {item.label}
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-6px',
                      right: 0,
                      left: 0,
                      height: '2px',
                      background: 'var(--ink)',
                    }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* الأدوات */}
        <div className="hdr-tools">
          <Link
            href="/admin"
            title="دخول لوحة الأدمن"
            className="hdr-tool-icon"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--rule)',
              background: 'transparent',
              color: 'var(--ink)',
              textDecoration: 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="2.5" />
              <path d="M8 1 V 3 M8 13 V 15 M1 8 H 3 M13 8 H 15 M3.2 3.2 L 4.6 4.6 M11.4 11.4 L 12.8 12.8 M3.2 12.8 L 4.6 11.4 M11.4 4.6 L 12.8 3.2" />
            </svg>
          </Link>

          <button
            title="الإشعارات"
            className="hdr-tool-icon"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--rule)',
              background: 'transparent',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M 3 13 H 13 L 12 11 V 7 C 12 4.8 10.2 3 8 3 C 5.8 3 4 4.8 4 7 V 11 Z" />
              <path d="M 6.5 13 C 6.5 13.8 7.2 14.5 8 14.5 C 8.8 14.5 9.5 13.8 9.5 13" />
            </svg>
          </button>

          <button
            className="hdr-en"
            style={{
              height: '40px',
              padding: '0 14px',
              border: '1px solid var(--rule)',
              background: 'transparent',
              fontFamily: 'var(--sans-lat)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--ink)',
              cursor: 'pointer',
              letterSpacing: '0.08em',
              alignItems: 'center',
            }}
          >
            EN
          </button>

          {session ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  height: '40px',
                  padding: '0 6px 0 12px',
                  background: 'var(--ink)',
                  color: 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  border: 'none',
                  maxWidth: '160px',
                }}
              >
                <span
                  style={{
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {session.name}
                </span>
                {(session.plan === 'pro' || session.plan === 'admin') && (
                  <span style={{
                    fontFamily: 'var(--sans-lat)',
                    fontSize: '9px',
                    fontWeight: 600,
                    letterSpacing: '0.15em',
                    padding: '3px 6px',
                    background: 'var(--amber)',
                    color: 'var(--ink)',
                    flexShrink: 0,
                  }}>
                    {session.plan === 'admin' ? 'ADMIN' : 'PRO'}
                  </span>
                )}
              </button>

              {menuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 30 }}
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      marginTop: '6px',
                      width: '180px',
                      zIndex: 40,
                      overflow: 'hidden',
                      background: '#fff',
                      border: '1px solid var(--rule)',
                      boxShadow: '0 4px 16px rgba(15,15,15,0.08)',
                    }}
                  >
                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      style={{ display: 'block', padding: '10px 14px', fontSize: '13px', color: 'var(--ink)', textDecoration: 'none' }}
                    >
                      الحساب
                    </Link>
                    {session.plan === 'admin' && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMenuOpen(false)}
                        style={{ display: 'block', padding: '10px 14px', fontSize: '13px', color: 'var(--ink)', textDecoration: 'none' }}
                      >
                        لوحة الأدمن
                      </Link>
                    )}
                    <Link
                      href="/support"
                      onClick={() => setMenuOpen(false)}
                      style={{ display: 'block', padding: '10px 14px', fontSize: '13px', color: 'var(--ink)', textDecoration: 'none' }}
                    >
                      الدعم الفني
                    </Link>
                    <div style={{ borderTop: '1px solid var(--rule)' }} />
                    <button
                      onClick={() => { logout(); setMenuOpen(false); router.push('/') }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '13px',
                        color: 'var(--bear)',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'right',
                        cursor: 'pointer',
                      }}
                    >
                      تسجيل الخروج
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              style={{
                height: '40px',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--ink)',
                color: 'var(--cream)',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
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
