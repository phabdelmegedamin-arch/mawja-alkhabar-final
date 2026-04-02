'use client'
import { useState, useEffect } from 'react'
import type { Subscriber, SubscriptionCode } from '@/types'

const TABS = [
  { id: 0, icon: '📊', label: 'إحصائيات' },
  { id: 1, icon: '👥', label: 'المشتركون' },
  { id: 2, icon: '🎫', label: 'الأكواد'   },
  { id: 3, icon: '📋', label: 'الأسهم'    },
  { id: 4, icon: '📜', label: 'السجل'     },
  { id: 5, icon: '⚙️', label: 'API'       },
]

interface Props {
  activeTab:   number
  onTabChange: (n: number) => void
  onLogout:    () => void
}

export default function AdminLayout({ activeTab, onTabChange, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-bg2 border-b border-b-1
                      flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <span className="text-ac font-black">🌊 موجة الخبر</span>
          <span className="text-tx-3 text-xs">Admin Panel</span>
        </div>
        <button onClick={onLogout}
          className="text-xs text-rd hover:text-rd/80 border border-rd/30
                     px-3 py-1.5 rounded-lg transition-colors">
          ✕ خروج
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 px-4 py-2 bg-bg2 border-b border-b-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs
                        font-medium whitespace-nowrap transition-all
                        ${activeTab === tab.id
                          ? 'bg-ac/10 text-ac border border-ac/20'
                          : 'text-tx-3 hover:text-tx-2 hover:bg-bg3'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {activeTab === 0 && <StatsPanel />}
        {activeTab === 1 && <SubscribersPanel />}
        {activeTab === 2 && <CodesPanel />}
        {activeTab === 3 && <StocksPanel />}
        {activeTab === 4 && <LogPanel />}
        {activeTab === 5 && <ApiPanel />}
      </div>
    </div>
  )
}

// ── Stats Panel ────────────────────────────────────
function StatsPanel() {
  const [stats, setStats] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/subscribers').then(r => r.json()).then(d => {
      if (d.success) setStats({ total: d.meta.total })
    })
    fetch('/api/codes').then(r => r.json()).then(d => {
      if (d.success) setStats(prev => ({ ...prev, codes: d.data.length }))
    })
  }, [])

  const cards = [
    { label: 'إجمالي المشتركين', value: stats.total ?? '—', icon: '👥', color: 'text-ac' },
    { label: 'أكواد الاشتراك',   value: stats.codes ?? '—', icon: '🎫', color: 'text-yl' },
    { label: 'تحليلات اليوم',    value: '—',                icon: '📊', color: 'text-gr' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="card p-4 text-center">
            <div className="text-3xl mb-1">{c.icon}</div>
            <div className={`text-2xl font-black font-mono ${c.color}`}>{c.value}</div>
            <div className="text-xs text-tx-3 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="card p-4">
        <h3 className="text-sm font-bold mb-3">إجراءات سريعة</h3>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-2 rounded-lg bg-ac text-bg text-xs font-bold"
            onClick={() => window.location.reload()}>
            🔄 تحديث البيانات
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Subscribers Panel ─────────────────────────────
function SubscribersPanel() {
  const [subs, setSubs]     = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ]           = useState('')

  const load = async (query = '') => {
    setLoading(true)
    const res  = await fetch(`/api/subscribers?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    if (data.success) setSubs(data.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = q ? subs.filter(s =>
    s.username?.toLowerCase().includes(q.toLowerCase()) ||
    s.name?.toLowerCase().includes(q.toLowerCase()) ||
    s.email?.toLowerCase().includes(q.toLowerCase())
  ) : subs

  const planColor = (plan: string) =>
    plan === 'admin' ? 'text-ac' : plan === 'pro' ? 'text-gr' : 'text-tx-3'
  const statusColor = (s: string) =>
    s === 'active' ? 'text-gr' : s === 'pending' ? 'text-yl' : 'text-rd'
  const statusLabel = (s: string) =>
    ({ active:'نشط', pending:'معلّق', expired:'منتهي', cancelled:'ملغي' }[s] ?? s)

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="🔍 بحث باسم أو إيميل..."
          className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-lg" />
        <button onClick={() => load(q)}
          className="px-4 py-2 rounded-lg bg-ac text-bg text-xs font-bold">
          تحديث
        </button>
        <span className="text-xs text-tx-3">{filtered.length} مشترك</span>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-tx-3 text-sm animate-pulse">جارٍ التحميل...</div>
      ) : !filtered.length ? (
        <div className="card p-8 text-center text-tx-3 text-sm">
          {q ? 'لا توجد نتائج' : 'لا يوجد مشتركون بعد'}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="adm-table">
            <thead>
              <tr>
                <th>المستخدم</th><th>الاسم</th><th>الباقة</th>
                <th>الحالة</th><th>الانضمام</th><th>آخر دخول</th><th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td className="font-mono text-ac text-xs">{s.username}</td>
                  <td className="text-xs">{s.name ?? '—'}</td>
                  <td className={`text-xs font-bold ${planColor(s.plan)}`}>{s.plan}</td>
                  <td className={`text-xs font-bold ${statusColor(s.status)}`}>{statusLabel(s.status)}</td>
                  <td className="text-2xs text-tx-3">{s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-SA') : '—'}</td>
                  <td className="text-2xs text-tx-3">{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString('ar-SA') : '—'}</td>
                  <td>
                    <button className="text-2xs text-ac hover:underline"
                      onClick={async () => {
                        await fetch('/api/subscribers', { method:'POST', headers:{'Content-Type':'application/json'},
                          body: JSON.stringify({ userId:s.id, action: s.status==='active'?'deactivate':'activate' }) })
                        load()
                      }}>
                      {s.status === 'active' ? 'إيقاف' : 'تفعيل'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Codes Panel ───────────────────────────────────
function CodesPanel() {
  const [codes, setCodes]   = useState<SubscriptionCode[]>([])
  const [newCode, setNew]   = useState('')
  const [note, setNote]     = useState('')
  const [expiry, setExpiry] = useState('')
  const [msg, setMsg]       = useState('')

  const load = async () => {
    const res  = await fetch('/api/codes')
    const data = await res.json()
    if (data.success) setCodes(data.data ?? [])
  }
  useEffect(() => { load() }, [])

  const genCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const rand  = (n: number) => Array.from({length:n},()=>chars[Math.floor(Math.random()*chars.length)]).join('')
    setNew(`MW-${rand(4)}-${rand(4)}`)
  }

  const addCode = async () => {
    if (!newCode) { setMsg('أدخل الكود'); return }
    const res  = await fetch('/api/codes', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'create', code:newCode, note, expiry }) })
    const data = await res.json()
    if (data.success) { setMsg('✅ تم إضافة الكود'); setNew(''); setNote(''); setExpiry(''); load() }
    else setMsg('❌ ' + data.error)
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="card p-4">
        <h3 className="text-sm font-bold mb-3">➕ إضافة كود جديد</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-2xs text-tx-3 block mb-1">الكود</label>
            <input value={newCode} onChange={e => setNew(e.target.value)}
              placeholder="MW-XXXX-XXXX" dir="ltr"
              className="w-full px-3 py-2 text-sm rounded-lg font-mono" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-2xs text-tx-3 block mb-1">ملاحظة</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="اختياري" className="w-full px-3 py-2 text-sm rounded-lg" />
          </div>
          <div>
            <label className="text-2xs text-tx-3 block mb-1">تاريخ الانتهاء</label>
            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg" />
          </div>
          <button onClick={genCode} className="px-3 py-2 rounded-lg border border-b-2 text-xs">🎲 توليد</button>
          <button onClick={addCode} className="px-4 py-2 rounded-lg bg-ac text-bg text-xs font-bold">+ إضافة</button>
        </div>
        {msg && <p className="text-xs mt-2" style={{color: msg.startsWith('✅') ? 'var(--gr)' : 'var(--rd)'}}>{msg}</p>}
      </div>

      {/* Codes table */}
      <div className="card overflow-x-auto">
        <table className="adm-table">
          <thead><tr><th>الكود</th><th>ملاحظة</th><th>الحالة</th><th>الانتهاء</th><th>آخر استخدام</th><th>إجراء</th></tr></thead>
          <tbody>
            {codes.map(c => (
              <tr key={c.code}>
                <td className="font-mono text-ac text-xs">{c.code}</td>
                <td className="text-xs text-tx-3">{c.note ?? '—'}</td>
                <td className={`text-xs font-bold ${c.active ? 'text-gr' : 'text-rd'}`}>{c.active ? '🟢 نشط' : '🔴 معطّل'}</td>
                <td className="text-2xs text-tx-3">{c.expiry ?? 'بلا تاريخ'}</td>
                <td className="text-2xs text-tx-3">{c.lastUsed ?? '—'}</td>
                <td className="flex gap-2">
                  <button className="text-2xs text-ac hover:underline"
                    onClick={async () => { await fetch('/api/codes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'toggle',code:c.code})}); load() }}>
                    {c.active ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button className="text-2xs text-rd hover:underline"
                    onClick={async () => { if(!confirm('حذف؟'))return; await fetch('/api/codes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',code:c.code})}); load() }}>
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!codes.length && <p className="text-center text-tx-3 text-sm py-6">لا توجد أكواد</p>}
      </div>
    </div>
  )
}

// ── Stocks Panel ──────────────────────────────────
function StocksPanel() {
  return (
    <div className="card p-8 text-center text-tx-3">
      <div className="text-4xl mb-3">📋</div>
      <p className="text-sm">تعديل الأسهم والقطاعات يتم عبر Supabase Dashboard أو ملف <code className="text-ac">market-db.ts</code></p>
    </div>
  )
}

// ── Log Panel ─────────────────────────────────────
function LogPanel() {
  const [log, setLog] = useState<any[]>([])
  useEffect(() => {
    // Local history from analysis store
    try {
      const raw = localStorage.getItem('mw-analysis')
      if (raw) {
        const parsed = JSON.parse(raw)
        setLog((parsed.state?.history ?? []).slice(0, 100))
      }
    } catch {}
  }, [])

  const dirColor = (d: string) => d === 'pos' ? 'text-gr' : d === 'neg' ? 'text-rd' : 'text-yl'
  const dirLabel = (d: string) => d === 'pos' ? 'إيجابي' : d === 'neg' ? 'سلبي' : 'محايد'

  return (
    <div className="card overflow-x-auto">
      <div className="p-3 border-b border-b-1 flex justify-between items-center">
        <span className="text-sm font-bold">سجل التحليلات ({log.length})</span>
        <button onClick={() => { localStorage.removeItem('mw-analysis'); setLog([]) }}
          className="text-xs text-rd hover:underline">مسح الكل</button>
      </div>
      {!log.length ? (
        <p className="text-center text-tx-3 text-sm py-8">لا توجد تحليلات مسجّلة</p>
      ) : (
        <table className="adm-table">
          <thead><tr><th>التاريخ</th><th>الاتجاه</th><th>الدرجة</th><th>القطاع</th><th>الخبر</th></tr></thead>
          <tbody>
            {log.map((e: any) => (
              <tr key={e.id}>
                <td className="text-2xs text-tx-3 whitespace-nowrap">{e.ts ? new Date(e.ts).toLocaleString('ar-SA') : '—'}</td>
                <td className={`text-xs font-bold ${dirColor(e.sentiment?.dir)}`}>{dirLabel(e.sentiment?.dir)}</td>
                <td className="font-mono text-ac text-xs">{e.sentiment?.score ?? 0}</td>
                <td className="text-xs text-tx-3">{e.primaryLabel || e.primary}</td>
                <td className="text-2xs text-tx max-w-[300px] truncate">{e.headline || e.text?.slice(0,80)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── API Settings Panel ────────────────────────────
function ApiPanel() {
  const [key, setKey]     = useState('')
  const [visible, setVis] = useState(false)
  const [status, setSt]   = useState('')

  useEffect(() => {
    const k = localStorage.getItem('anthropic_key') ?? ''
    setKey(k)
    setSt(k ? `✅ مفتاح محفوظ: ${k.slice(0,12)}…` : '❌ لا يوجد مفتاح')
  }, [])

  const save = () => {
    localStorage.setItem('anthropic_key', key.trim())
    setSt(`✅ تم الحفظ: ${key.trim().slice(0,12)}…`)
  }

  const test = async () => {
    setSt('⏳ جارٍ الاختبار...')
    const res  = await fetch('/api/ai', { method:'POST', headers:{'Content-Type':'application/json','x-api-key':key}, body:JSON.stringify({prompt:'hi',maxTokens:5}) })
    const data = await res.json()
    setSt(data.success ? '✅ المفتاح صالح وجاهز' : '❌ ' + data.error)
  }

  return (
    <div className="card p-6 max-w-xl space-y-4">
      <h3 className="text-sm font-bold">🤖 مفتاح Claude AI</h3>
      <div className="flex gap-2">
        <input type={visible ? 'text' : 'password'} value={key} onChange={e => setKey(e.target.value)}
          placeholder="sk-ant-api03-..." dir="ltr"
          className="flex-1 px-3 py-2.5 text-sm rounded-lg font-mono" />
        <button onClick={() => setVis(v => !v)} className="px-3 py-2 rounded-lg border border-b-2 text-sm">👁</button>
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="px-4 py-2 rounded-lg bg-ac text-bg text-xs font-bold">💾 حفظ</button>
        <button onClick={test} className="px-4 py-2 rounded-lg border border-ac text-ac text-xs font-bold">🧪 اختبار</button>
      </div>
      {status && <p className="text-xs" style={{color: status.startsWith('✅') ? 'var(--gr)' : status.startsWith('⏳') ? 'var(--yl)' : 'var(--rd)'}}>{status}</p>}
    </div>
  )
}
