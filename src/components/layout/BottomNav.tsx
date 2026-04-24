'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWatchlistStore } from '@/store/watchlist'
import { useAnalysisStore } from '@/store/analysis'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════
   4 تبويبات فقط — مطابقة للـ Header
   التحليل / السجل / المتابعة / الأسعار
   ═══════════════════════════════════════════════ */
const NAV_ITEMS = [
  { href: '/',           icon: '◉', label: 'التحليل'   },
  { href: '/history',    icon: '☰', label: 'السجل'     },
  { href: '/watchlist',  icon: '☆', label: 'المتابعة'  },
  { href: '/prices',     icon: '◈', label: 'الأسعار'   },
]

export default function BottomNav() {
  const pathname    = usePathname()
  const watchCount  = useWatchlistStore(s => s.items.length)
  const histCount   = useAnalysisStore(s => s.history.length)

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden
                    bg-bg2 border-t border-b-1
                    flex items-stretch
                    pb-safe">
      {NAV_ITEMS.map(({ href, icon, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        const badge  = href === '/watchlist' ? watchCount
                     : href === '/history'   ? histCount : 0

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5',
              'pt-2 pb-1 text-xs transition-colors duration-200',
              active ? 'text-tx' : 'text-tx-3 hover:text-tx-2'
            )}
          >
            <div className="relative">
              <span
                className="text-lg leading-none"
                style={{ opacity: active ? 1 : 0.6 }}
              >
                {icon}
              </span>
              {badge > 0 && (
                <span className="absolute -top-1 -right-1.5
                                 min-w-4 h-4 px-0.5 rounded-full
                                 bg-ac text-bg text-[9px] font-black
                                 flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span className={cn('font-medium text-[11px]', active && 'font-semibold')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
