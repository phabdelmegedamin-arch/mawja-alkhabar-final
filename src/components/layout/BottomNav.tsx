'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWatchlistStore } from '@/store/watchlist'
import { useAnalysisStore } from '@/store/analysis'

/* ═══════════════════════════════════════════════
   5 تبويبات للموبايل — مزامنة مع الـ Header
   ═══════════════════════════════════════════════ */
const NAV_ITEMS = [
  { href: '/',           icon: '◉', label: 'التحليل'   },
  { href: '/history',    icon: '☰', label: 'السجل'     },
  { href: '/watchlist',  icon: '☆', label: 'المتابعة'  },
  { href: '/prices',     icon: '◈', label: 'الأسعار'   },
  { href: '/support',    icon: '?', label: 'الدعم'     },
]

export default function BottomNav() {
  const pathname    = usePathname()
  const watchCount  = useWatchlistStore(s => s.items.length)
  const histCount   = useAnalysisStore(s => s.history.length)

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden flex items-stretch pb-safe"
      style={{
        background: 'var(--cream-soft)',
        borderTop: '1px solid var(--rule)',
      }}
    >
      {NAV_ITEMS.map(({ href, icon, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        const badge  = href === '/watchlist' ? watchCount
                     : href === '/history'   ? histCount : 0

        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center transition-colors"
            style={{
              gap: '2px',
              padding: '8px 4px 6px',
              fontSize: '11px',
              color: active ? 'var(--ink)' : 'var(--muted)',
            }}
          >
            <div className="relative">
              <span style={{ fontSize: '18px', lineHeight: 1, opacity: active ? 1 : 0.6 }}>
                {icon}
              </span>
              {badge > 0 && (
                <span
                  className="absolute"
                  style={{
                    top: '-4px',
                    right: '-6px',
                    minWidth: '14px',
                    height: '14px',
                    padding: '0 3px',
                    borderRadius: '50%',
                    background: 'var(--amber)',
                    color: 'var(--ink)',
                    fontSize: '9px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span style={{
              fontWeight: active ? 600 : 500,
              fontSize: '11px',
            }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
