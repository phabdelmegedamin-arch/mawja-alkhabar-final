'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Button, Badge, Skeleton } from '@/components/ui'
import { formatDate, sentimentLabel } from '@/lib/utils'

interface Sub {
  id: string; username: string; name: string
  plan: string; status: string; created_at: string
  subscriptions?: any[]
}

export default function SubscribersPage() {
  const [subs, setSubs]   = useState<Sub[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('all')
  const [page, setPage]       = useState(1)
  const perPage = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: search, status, page: String(page), per_page: String(perPage) })
      const res  = await fetch(`/api/subscribers?${params}`)
      const data = await res.json()
      setSubs(data.data ?? [])
      setTotal(data.meta?.total ?? 0)
    } finally { setLoading(false) }
  }, [search, status, page])

  useEffect(() => { load() }, [load])

  const action = async (userId: string, act: string, extra?: any) => {
    await fetch('/api/subscribers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: act, ...extra }),
    })
    load()
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-black">👥 المشتركون</h2>
            <p className="text-xs text-tx-3">{total} مشترك إجمالي</p>
          </div>
          <Button size="sm" onClick={()=>{ const csv=subs.map(s=>`${s.username},${s.name},${s.plan},${s.status},${s.created_at}`).join('\n'); const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,\uFEFF'+'المستخدم,الاسم,الباقة,الحالة,التاريخ\n'+csv; a.download='subscribers.csv'; a.click() }}>
            📤 تصدير CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
            placeholder="🔍 بحث..." className="px-3 py-1.5 text-xs rounded-lg bg-bg3 border border-b-2 text-tx w-48" />
          {['all','active','pending','expired'].map(s => (
            <button key={s} onClick={()=>{setStatus(s);setPage(1)}}
              className={`px-2.5 py-1.5 text-xs rounded-lg font-bold transition-all ${status===s?'bg-ac text-bg':'bg-bg3 border border-b-2 text-tx-3'}`}>
              {s==='all'?'الكل':s==='active'?'نشط':s==='pending'?'معلّق':'منتهي'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="adm-table">
              <thead><tr>
                <th>المستخدم</th><th>الاسم</th><th>الباقة</th>
                <th>الحالة</th><th>التاريخ</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  Array.from({length:5}).map((_,i) => (
                    <tr key={i}>{Array.from({length:6}).map((_,j)=><td key={j}><Skeleton className="h-4 w-full" /></td>)}</tr>
                  ))
                ) : subs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-tx-3 text-sm">لا توجد نتائج</td></tr>
                ) : subs.map(s => (
                  <tr key={s.id}>
                    <td><span className="font-mono text-ac text-xs">{s.username}</span></td>
                    <td className="text-sm">{s.name}</td>
                    <td><Badge variant={s.plan==='pro'||s.plan==='admin'?'ac':'default'}>{s.plan}</Badge></td>
                    <td><Badge variant={s.status==='active'?'pos':s.status==='pending'?'neu':'neg'}>{s.status}</Badge></td>
                    <td className="text-xs text-tx-3">{formatDate(s.created_at)}</td>
                    <td>
                      <div className="flex gap-1.5">
                        {s.status !== 'active' && (
                          <Button size="sm" variant="secondary" onClick={()=>action(s.id,'activate',{plan:'pro'})}>تفعيل</Button>
                        )}
                        {s.status === 'active' && (
                          <Button size="sm" variant="ghost" onClick={()=>action(s.id,'deactivate')}>إيقاف</Button>
                        )}
                        <Button size="sm" variant="danger" onClick={()=>confirm('حذف المشترك؟')&&action(s.id,'delete')}>حذف</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {total > perPage && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-b-1">
              <span className="text-xs text-tx-3">{(page-1)*perPage+1}–{Math.min(page*perPage,total)} من {total}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← السابق</Button>
                <Button size="sm" variant="secondary" disabled={page*perPage>=total} onClick={()=>setPage(p=>p+1)}>التالي →</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
