'use client'
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Button, Badge } from '@/components/ui'
import { formatDate } from '@/lib/utils'

interface Code { code: string; note?: string; plan: string; active: boolean; expiry?: string; created_at: string; used_by?: string; last_used_at?: string }

export default function CodesPage() {
  const [codes, setCodes] = useState<Code[]>([])
  const [loading, setLoading] = useState(true)
  const [newCode, setNewCode] = useState('')
  const [note, setNote] = useState('')
  const [expiry, setExpiry] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => { setLoading(true); const res = await fetch('/api/codes'); const d = await res.json(); setCodes(d.data??[]); setLoading(false) }
  useEffect(() => { load() }, [])

  const gen = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const r = (n: number) => Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setNewCode(`MW-${r(4)}-${r(4)}`)
  }

  const add = async () => {
    if (!newCode) return
    const res = await fetch('/api/codes', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'create', code: newCode, note, expiry: expiry || undefined }) })
    const data = await res.json()
    if (data.success) { setMsg('✅ تم الإضافة'); setNewCode(''); setNote(''); setExpiry(''); load() }
    else setMsg('❌ ' + data.error)
    setTimeout(() => setMsg(''), 3000)
  }

  const toggle = async (code: string) => { await fetch('/api/codes', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'toggle', code})}); load() }
  const del = async (code: string) => { if (!confirm('حذف الكود؟')) return; await fetch('/api/codes', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete', code})}); load() }

  return (
    <AdminLayout activeTab={2}>
      <div className="space-y-4 p-6">
        <h2 className="text-lg font-black">🏷️ أكواد الاشتراك</h2>
        <div className="card p-4">
          <h3 className="text-sm font-bold mb-3">إضافة كود جديد</h3>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex gap-2 items-center">
              <input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="MW-XXXX-XXXX" dir="ltr" className="px-3 py-2 text-sm rounded-lg bg-bg3 border border-b-2 text-tx w-48 font-mono" />
              <Button size="sm" variant="secondary" onClick={gen}>🎲 توليد</Button>
            </div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="px-3 py-2 text-sm rounded-lg bg-bg3 border border-b-2 text-tx w-44" />
            <input value={expiry} onChange={e => setExpiry(e.target.value)} type="date" className="px-3 py-2 text-sm rounded-lg bg-bg3 border border-b-2 text-tx" />
            <Button onClick={add}>+ إضافة</Button>
          </div>
          {msg && <p className={`text-xs mt-2 ${msg.startsWith('✅') ? 'text-gr' : 'text-rd'}`}>{msg}</p>}
        </div>
        <div className="card overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-b-1">
            <span className="text-sm font-bold">{codes.length} كود</span>
            <Button size="sm" variant="secondary" onClick={() => { const csv = codes.map(c => `${c.code},${c.note ?? ''},${c.active ? 'نشط' : 'معطّل'},${c.expiry ?? ''},${c.used_by ?? ''}`).join('\n'); const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,\uFEFFالكود,الملاحظة,الحالة,الانتهاء,المستخدم\n' + csv; a.download = 'codes.csv'; a.click() }}>📤 تصدير</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="adm-table">
              <thead><tr><th>الكود</th><th>الملاحظة</th><th>الحالة</th><th>الانتهاء</th><th>مستخدم بواسطة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="text-center py-6 text-tx-3">⏳ جارٍ التحميل...</td></tr>
                : codes.length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-tx-3">لا توجد أكواد</td></tr>
                : codes.map(c => {
                  const expired = c.expiry && new Date(c.expiry) < new Date()
                  return (
                    <tr key={c.code}>
                      <td><span className="font-mono text-xs text-ac">{c.code}</span></td>
                      <td className="text-xs text-tx-2">{c.note ?? '—'}</td>
                      <td><Badge variant={!c.active ? 'neg' : expired ? 'neu' : 'pos'}>{!c.active ? 'معطّل' : expired ? 'منتهي' : 'نشط'}</Badge></td>
                      <td className="text-xs text-tx-3">{c.expiry ? formatDate(c.expiry) : 'بلا تاريخ'}</td>
                      <td className="text-xs text-tx-3">{c.used_by ?? '—'}</td>
                      <td>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => toggle(c.code)}>{c.active ? 'تعطيل' : 'تفعيل'}</Button>
                          <Button size="sm" variant="danger" onClick={() => del(c.code)}>حذف</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
