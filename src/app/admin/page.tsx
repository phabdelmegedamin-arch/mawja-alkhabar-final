'use client'
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { StatCard, Skeleton } from '@/components/ui'
import { useAuthStore } from '@/store/auth'

interface Stats {
  totalSubscribers: number
  activeSubscribers: number
  pendingSubscribers: number
  totalCodes: number
  activeCodes: number
  analyses: number
}

export default function AdminPage() {
  const { session } = useAuthStore()
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [subRes, codeRes] = await Promise.all([
          fetch('/api/subscribers?per_page=1'),
          fetch('/api/codes'),
        ])
        const subData  = await subRes.json()
        const codeData = await codeRes.json()
        const codes: any[] = codeData.data ?? []

        setStats({
          totalSubscribers:   subData.meta?.total ?? 0,
          activeSubscribers:  0, // from filter
          pendingSubscribers: 0,
          totalCodes:  codes.length,
          activeCodes: codes.filter((c: any) => c.active).length,
          analyses:    0,
        })
      } catch { } finally { setLoading(false) }
    }
    fetchStats()
  }, [])

  return (
    <AdminLayout activeTab="stats">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-black">📊 لوحة الإحصائيات</h2>
          <p className="text-xs text-tx-3 mt-1">مرحباً، {session?.name}</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard icon="👥" label="إجمالي المشتركين" value={stats?.totalSubscribers ?? 0} />
            <StatCard icon="✅" label="مشتركون نشطون"   value={stats?.activeSubscribers ?? 0}  color="var(--gr)" />
            <StatCard icon="⏳" label="طلبات معلّقة"    value={stats?.pendingSubscribers ?? 0} color="var(--yl)" />
            <StatCard icon="🎫" label="إجمالي الأكواد"  value={stats?.totalCodes ?? 0} />
            <StatCard icon="🟢" label="أكواد نشطة"      value={stats?.activeCodes ?? 0}        color="var(--gr)" />
            <StatCard icon="📈" label="تحليلات اليوم"   value={stats?.analyses ?? 0}           color="var(--ac)" />
          </div>
        )}

        {/* Quick actions */}
        <div className="card p-4">
          <h3 className="text-sm font-bold text-tx-2 mb-3">إجراءات سريعة</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { href:'/admin/subscribers', label:'👥 المشتركون' },
              { href:'/admin/codes',       label:'🎫 الأكواد' },
              { href:'/admin/stocks',      label:'📈 الأسهم' },
            ].map(({ href, label }) => (
              <a key={href} href={href}
                className="px-3 py-2 card text-sm font-bold hover:border-ac hover:text-ac transition-all">
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
