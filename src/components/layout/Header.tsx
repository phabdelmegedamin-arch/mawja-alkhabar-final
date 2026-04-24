'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useState } from 'react'

/* ═══════════════════════════════════════════════
   4 تبويبات فقط — حسب التصميم الأصلي v7
   التحليل / السجل / المتابعة / الأسعار
   ═══════════════════════════════════════════════ */
const NAV = [
  { href: '/',          label: 'التحليل'   },
  { href: '/history',   label: 'السجل'     },
  { href: '/watchlist', label: 'المتابعة'  },
  { href: '/prices',    label: 'الأسعار'   },
]

/* ═══════════════════════════════════════════════
   اللوجو الأصلي — موجات صفراء + خط أسود متدرّج
   ═══════════════════════════════════════════════ */
function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="موجة الخبر"
    >
      <circle cx="8" cy="24" r="3" fill="#F5B71C" />
      <path
        d="M 16 14 Q 22 24, 16 34"
        stroke="#0F0F0F"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 24 8 Q 34 24, 24 40"
        stroke="#0F0F0F"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M 34 4 Q 46 24, 34 44"
        stroke="#0F0F0F"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.22"
      />
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
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(244, 239, 230, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--b1)',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">

        {/* ─── LOGO (موجة الخبر + MAWJA · NEWS SENTIMENT) ─── */}
        <Link
          href="/"
          className="flex items-center gap-3 shrink-0 hover:opacity-80 transition-opacity"
        >
          <Logo size={36} />
          <div className="hidden sm:flex flex-col leading-none gap-1">
            <span
              className="font-semibold text-[17px]"
              style={{ color: 'var(--tx)', letterSpacing: '-0.015em' }}
            >
              موجة الخبر
            </span>
            <span
              className="text-[9px] uppercase"
              style={{
                color: 'var(--t3)',
                fontFamily: 'var(--sans-lat)',
                letterSpacing: '0.22em',
                fontWeight: 500,
              }}
            >
              MAWJA · NEWS SENTIMENT
            </span>
          </div>
        </Link>

        {/* ─── تبويبات Desktop (4 فقط) ─── */}
        <nav className="hidden md:flex items-center gap-8 mr-8">
          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-[14px] transition-opacity hover:opacity-70 py-1"
                style={{
                  color:      'var(--tx)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute -bottom-[18px] right-0 left-0 h-[2px]"
                    style={{ background: 'var(--tx)' }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* ─── Actions: زر الأدمن + زر الإشعارات + زر الدخول/المستخدم ───
           ملاحظة: تم حذف زر اللغة EN وزر الشمس/القمر بناءً على طلب التصميم */}
        <div className="flex items-center gap-2">

          {/* ═══ زر دخول لوحة الأدمن (ظاهر دائماً — أيقونة الترس) ═══ */}
          <Link
            href="/admin"
            title="دخول لوحة الأدمن"
            className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-[var(--bg3)]"
            style={{
              color: 'var(--tx)',
              border: '1px solid var(--b1)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="8" cy="8" r="2.2" />
              <path
                d="M8 1.2 V 3 M8 13 V 14.8 M1.2 8 H 3 M13 8 H 14.8 M3.2 3.2 L 4.5 4.5 M11.5 11.5 L 12.8 12.8 M3.2 12.8 L 4.5 11.5 M11.5 4.5 L 12.8 3.2"
                strokeLinecap="round"
              />
            </svg>
          </Link>

          {/* ═══ زر الإشعارات ═══ */}
          <button
            title="الإشعارات"
            className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-[var(--bg3)]"
            style={{
              color: 'var(--tx)',
              border: '1px solid var(--b1)',
              background: 'transparent',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M 3 13 H 13 L 12 11 V 7 C 12 4.8 10.2 3 8 3 C 5.8 3 4 4.8 4 7 V 11 Z" />
              <path d="M 6.5 13 C 6.5 13.8 7.2 14.5 8 14.5 C 8.8 14.5 9.5 13.8 9.5 13" />
            </svg>
          </button>

          {/* ═══ User chip أو زر دخول ═══ */}
          {session ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 h-9 pr-3 pl-1.5 transition-opacity hover:opacity-90"
                style={{
                  background: 'var(--tx)',
                  color: 'var(--bg)',
                }}
              >
                <span className="text-[13px] font-medium">{session.name}</span>
                {session.plan === 'pro' && (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-[3px]"
                    style={{
                      background: '#F5B71C',
                      color: 'var(--tx)',
                      letterSpacing: '0.15em',
                      fontFamily: 'var(--sans-lat)',
                    }}
                  >
                    PRO
                  </span>
                )}
                {session.plan === 'admin' && (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-[3px]"
                    style={{
                      background: '#F5B71C',
                      color: 'var(--tx)',
                      letterSpacing: '0.15em',
                      fontFamily: 'var(--sans-lat)',
                    }}
                  >
                    ADMIN
                  </span>
                )}
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute left-0 mt-1.5 w-44 z-40 overflow-hidden animate-slide-up"
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
                    {session.plan === 'admin' && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-[var(--bg3)] transition-colors"
                        style={{ color: 'var(--tx)' }}
                      >
                        <span>لوحة الأدمن</span>
                      </Link>
                    )}
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
              className="h-9 px-4 flex items-center text-[13px] font-medium transition-opacity hover:opacity-90"
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
