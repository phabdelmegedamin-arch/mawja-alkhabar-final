'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/admin',             icon: '📊', label: 'إحصائيات' },
  { href: '/admin/subscribers', icon: '👥', label: 'المشتركون' },
  { href: '/admin/codes',       icon: '🎫', label: 'الأكواد'   },
  { href: '/admin/stocks',      icon: '📈', label: 'الأسهم'    },
]

interface Props {
  children: React.ReactNode
}

export default function AdminLayout({ children }: Props) {
  const pathname = usePathname()
  const logout   = useAuthStore(s => s.logout)

  return (
    <div className="min-h-screen bg-bg">
      <div className="sticky top-0 z-40 bg-bg2 border-b border-b-1 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-ac rounded-lg flex items-center justify-center text-bg font-black text-sm">〜</div>
            <span className="font-black text-sm">موجة <em className="text-ac not-italic">الخبر</em></span>
          </Link>
          <span className="text-tx-3 text-xs border border-b-2 px-2 py-0.5 rounded">Admin</span>
        </div>
        <button onClick={logout}
          className="text-xs text-tx-3 hover:text-rd border border-b-2 px-3 py-1.5 rounded-lg transition-colors">
          خروج
        </button>
      </div>

      <div className="flex">
        <aside className="hidden md:flex flex-col w-48 min-h-screen border-l border-b-1 bg-bg2 pt-4">
          {TABS.map(tab => (
            <Link key={tab.href} href={tab.href}
              className={cn(
                'flex items-center gap-2.5 px-4 py-3 text-sm transition-colors',
                pathname === tab.href
                  ? 'text-ac bg-ac/10 border-l-2 border-ac font-bold'
                  : 'text-tx-3 hover:text-tx hover:bg-bg3'
              )}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          ))}
        </aside>

        <div className="md:hidden flex border-b border-b-1 bg-bg2 w-full overflow-x-auto">
          {TABS.map(tab => (
            <Link key={tab.href} href={tab.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap transition-colors',
                pathname === tab.href ? 'text-ac border-b-2 border-ac font-bold' : 'text-tx-3'
              )}>
              {tab.icon} {tab.label}
            </Link>
          ))}
        </div>

        <main className="flex-1 p-4 md:p-6 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  )
}
