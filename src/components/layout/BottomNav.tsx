'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWatchlistStore } from '@/store/watchlist'
import { useAnalysisStore } from '@/store/analysis'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',           icon: '📊', label: 'تحليل'  },
  { href: '/news',       icon: '📰', label: 'أخبار'  },
  { href: '/watchlist',  icon: '⭐', label: 'متابعة' },
  { href: '/history',    icon: '⏱', label: 'سجل'    },
  { href: '/portfolio',  icon: '💼', label: 'محفظة'  },
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
        const active = pathname === href
        const badge  = href === '/watchlist' ? watchCount
                     : href === '/history'   ? histCount : 0

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5',
              'pt-2 pb-1 text-xs transition-colors duration-200',
              active ? 'text-ac' : 'text-tx-3 hover:text-tx-2'
            )}
          >
            <div className="relative">
              <span className="text-xl leading-none">{icon}</span>
              {badge > 0 && (
                <span className="absolute -top-1 -right-1.5
                                 min-w-4 h-4 px-0.5 rounded-full
                                 bg-ac text-bg text-[9px] font-black
                                 flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span className={cn('font-medium', active && 'font-bold')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
