'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'

type TicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

interface Ticket {
  id:          string
  ticket_no:   number
  user_id:     string | null
  name:        string
  email:       string
  phone:       string | null
  category:    string
  subject:     string
  message:     string
  priority:    TicketPriority
  status:      TicketStatus
  admin_reply: string | null
  admin_note:  string | null
  created_at:  string
  updated_at:  string
  replied_at:  string | null
}

interface Summary {
  total: number
  open: number
  in_progress: number
  resolved: number
  urgent: number
}

const STATUS_META: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:        { label: 'مفتوحة',       color: 'var(--rd)', bg: 'var(--rd2)' },
  in_progress: { label: 'قيد المعالجة',  color: 'var(--yl)', bg: 'var(--yl2)' },
  resolved:    { label: 'محلولة',       color: 'var(--gr)', bg: 'var(--gr2)' },
  closed:      { label: 'مغلقة',        color: 'var(--t2)', bg: 'var(--bg3)' },
}

const PRIORITY_META: Record<TicketPriority, { label: string; color: string }> = {
  urgent: { label: 'عاجل',  color: '#C63939' },
  high:   { label: 'مرتفع', color: '#B85C00' },
  normal: { label: 'عادي',  color: 'var(--t2)' },
  low:    { label: 'منخفض', color: 'var(--t3)' },
}

const CATEGORY_LABEL: Record<string, string> = {
  technical:  'فنية',
  billing:    'دفع',
  suggestion: 'اقتراح',
  bug:        'خطأ',
  general:    'عام',
}

export default function AdminSupportPage() {
  const router  = useRouter()
  const session = useAuthStore(s => s.session)

  const [tickets,  setTickets]  = useState<Ticket[]>([])
  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Ticket | null>(null)

  const [fStatus,   setFStatus]   = useState('all')
  const [fPriority, setFPriority] = useState('all')
  const [fCategory, setFCategory] = useState('all')
  const [fSearch,   setFSearch]   = useState('')

  const [replyText, setReplyText] = useState('')
  const [noteText,  setNoteText]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')

  useEffect(() => {
    if (!session || session.plan !== 'admin') {
      router.push('/admin')
    }
  }, [session, router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fStatus   !== 'all') params.set('status',   fStatus)
      if (fPriority !== 'all') params.set('priority', fPriority)
      if (fCategory !== 'all') params.set('category', fCategory)
      if (fSearch)             params.set('q',        fSearch)

      const res  = await fetch('/api/admin/support?' + params.toString())
      const data = await res.json()
      if (data.success) {
        setTickets(data.data || [])
        setSummary(data.meta?.summary ?? null)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [fStatus, fPriority, fCategory, fSearch])

  useEffect(() => { load() }, [load])

  const openTicket = (t: Ticket) => {
    setSelected(t)
    setReplyText(t.admin_reply ?? '')
    setNoteText(t.admin_note   ?? '')
    setSaveMsg('')
  }

  const updateTicket = async (patch: Partial<Ticket>) => {
    if (!selected) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/admin/support', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: selected.id, ...patch }),
      })
      const data = await res.json()
      if (data.success) {
        setSaveMsg('تم الحفظ')
        setTickets(ts => ts.map(t => t.id === selected.id ? data.data : t))
        setSelected(data.data)
        setTimeout(() => setSaveMsg(''), 2500)
      } else {
        setSaveMsg(data.error || 'تعذر الحفظ')
      }
    } catch {
      setSaveMsg('خطأ في الاتصال')
    }
    setSaving(false)
  }

  const deleteTicket = async (id: string) => {
    if (!confirm('حذف التذكرة نهائيا؟')) return
    try {
      const res  = await fetch('/api/admin/support?id=' + id, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setTickets(ts => ts.filter(t => t.id !== id))
        setSelected(null)
      }
    } catch {}
  }

  if (!session || session.plan !== 'admin') return null

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-[1280px] mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1 text-[11px] mb-2 hover:underline"
              style={{ color: 'var(--t2)' }}
            >
              &larr; لوحة الأدمن
            </Link>
            <h1 className="text-[22px] font-medium" style={{ color: 'var(--tx)' }}>
              تذاكر الدعم
            </h1>
          </div>
          <button
            onClick={load}
            className="px-3 py-1.5 rounded text-[12px]"
            style={{ background: 'var(--bg3)', color: 'var(--t2)', border: '1px solid var(--b1)' }}
          >
            تحديث
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
            <StatCard label="المجموع"       value={summary.total}       color="var(--tx)" />
            <StatCard label="مفتوحة"        value={summary.open}        color="var(--rd)" />
            <StatCard label="قيد المعالجة"   value={summary.in_progress} color="var(--yl)" />
            <StatCard label="محلولة"        value={summary.resolved}    color="var(--gr)" />
            <StatCard label="عاجلة"         value={summary.urgent}      color="#C63939" emphasis />
          </div>
        )}

        <div
          className="card p-3 mb-4 flex flex-wrap items-center gap-2"
          style={{ background: '#fff' }}
        >
          <input
            type="text"
            value={fSearch}
            onChange={e => setFSearch(e.target.value)}
            placeholder="ابحث بالموضوع، الاسم، البريد"
            className="flex-1 min-w-[180px] text-[12px]"
            style={{ padding: '6px 10px' }}
          />
          <select
            value={fStatus}
            onChange={e => setFStatus(e.target.value)}
            className="text-[12px]"
            style={{ padding: '6px 10px', background: '#fff' }}
          >
            <option value="all">كل الحالات</option>
            <option value="open">مفتوحة</option>
            <option value="in_progress">قيد المعالجة</option>
            <option value="resolved">محلولة</option>
            <option value="closed">مغلقة</option>
          </select>
          <select
            value={fPriority}
            onChange={e => setFPriority(e.target.value)}
            className="text-[12px]"
            style={{ padding: '6px 10px', background: '#fff' }}
          >
            <option value="all">كل الأولويات</option>
            <option value="urgent">عاجل</option>
            <option value="high">مرتفع</option>
            <option value="normal">عادي</option>
            <option value="low">منخفض</option>
          </select>
          <select
            value={fCategory}
            onChange={e => setFCategory(e.target.value)}
            className="text-[12px]"
            style={{ padding: '6px 10px', background: '#fff' }}
          >
            <option value="all">كل الفئات</option>
            <option value="technical">فنية</option>
            <option value="billing">دفع</option>
            <option value="suggestion">اقتراح</option>
            <option value="bug">خطأ</option>
            <option value="general">عام</option>
          </select>
        </div>

        <div className="card overflow-hidden" style={{ background: '#fff' }}>
          <div className="overflow-x-auto">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الموضوع</th>
                  <th>المرسل</th>
                  <th>الفئة</th>
                  <th>الأولوية</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-8" style={{ color: 'var(--t3)' }}>
                      جار التحميل
                    </td>
                  </tr>
                )}
                {!loading && tickets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8" style={{ color: 'var(--t3)' }}>
                      لا توجد تذاكر
                    </td>
                  </tr>
                )}
                {!loading && tickets.map(t => {
                  const s = STATUS_META[t.status]
                  const p = PRIORITY_META[t.priority]
                  return (
                    <tr
                      key={t.id}
                      onClick={() => openTicket(t)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="mono-num" style={{ color: 'var(--t3)', fontSize: 11 }}>
                        #{String(t.ticket_no).padStart(5, '0')}
                      </td>
                      <td>
                        <div className="font-medium" style={{ color: 'var(--tx)', fontSize: 13 }}>
                          {t.subject}
                        </div>
                        <div
                          className="text-[11px] truncate max-w-[320px]"
                          style={{ color: 'var(--t3)' }}
                        >
                          {t.message.slice(0, 80)}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--tx)', fontSize: 12 }}>{t.name}</div>
                        <div
                          className="mono-num text-[10px]"
                          style={{ color: 'var(--t3)' }}
                          dir="ltr"
                        >
                          {t.email}
                        </div>
                      </td>
                      <td>
                        <span
                          className="tag"
                          style={{ background: 'var(--bg3)', color: 'var(--t2)', fontSize: 11 }}
                        >
                          {CATEGORY_LABEL[t.category] ?? t.category}
                        </span>
                      </td>
                      <td>
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium"
                          style={{ color: p.color }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: p.color }}
                          />
                          {p.label}
                        </span>
                      </td>
                      <td>
                        <span
                          className="tag"
                          style={{ background: s.bg, color: s.color, fontSize: 11 }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="mono-num text-[10px]" style={{ color: 'var(--t3)' }}>
                        {new Date(t.created_at).toLocaleDateString('ar-SA', {
                          month: 'short',
                          day:   'numeric',
                        })}
                        <br />
                        {new Date(t.created_at).toLocaleTimeString('ar-SA', {
                          hour:   '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,15,0.5)' }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="card overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up"
            style={{ background: '#fff' }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--b1)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="mono-num text-[11px] font-medium px-2 py-0.5 rounded"
                  style={{ background: 'var(--ac2)', color: 'var(--ac)' }}
                >
                  #{String(selected.ticket_no).padStart(5, '0')}
                </span>
                <span className="text-[15px] font-medium" style={{ color: 'var(--tx)' }}>
                  {selected.subject}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-[22px] leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg3)]"
                style={{ color: 'var(--t2)' }}
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Meta label="المرسل" value={selected.name} />
                <Meta label="البريد" value={selected.email} mono ltr />
                {selected.phone && <Meta label="الجوال" value={selected.phone} mono ltr />}
                <Meta
                  label="الفئة"
                  value={CATEGORY_LABEL[selected.category] ?? selected.category}
                />
              </div>

              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.12em] mb-1.5"
                  style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
                >
                  الرسالة الأصلية
                </div>
                <div
                  className="p-3 rounded text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{ background: 'var(--bg3)', color: 'var(--tx)', border: '1px solid var(--b1)' }}
                >
                  {selected.message}
                </div>
                <div className="text-[10px] mt-1.5" style={{ color: 'var(--t3)' }}>
                  {new Date(selected.created_at).toLocaleString('ar-SA')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div
                    className="text-[10px] uppercase tracking-[0.12em] mb-1.5"
                    style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
                  >
                    الحالة
                  </div>
                  <select
                    value={selected.status}
                    onChange={e => updateTicket({ status: e.target.value as TicketStatus })}
                    disabled={saving}
                    className="w-full text-[13px]"
                    style={{ padding: '7px 10px' }}
                  >
                    <option value="open">مفتوحة</option>
                    <option value="in_progress">قيد المعالجة</option>
                    <option value="resolved">محلولة</option>
                    <option value="closed">مغلقة</option>
                  </select>
                </div>
                <div>
                  <div
                    className="text-[10px] uppercase tracking-[0.12em] mb-1.5"
                    style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
                  >
                    الأولوية
                  </div>
                  <select
                    value={selected.priority}
                    onChange={e => updateTicket({ priority: e.target.value as TicketPriority })}
                    disabled={saving}
                    className="w-full text-[13px]"
                    style={{ padding: '7px 10px' }}
                  >
                    <option value="low">منخفض</option>
                    <option value="normal">عادي</option>
                    <option value="high">مرتفع</option>
                    <option value="urgent">عاجل</option>
                  </select>
                </div>
              </div>

              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.12em] mb-1.5"
                  style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
                >
                  الرد الرسمي (يظهر للمستخدم)
                </div>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="اكتب ردك هنا"
                  className="w-full text-[13px]"
                  style={{ padding: '10px 12px', resize: 'vertical', fontFamily: 'var(--sans)' }}
                />
                {selected.replied_at && (
                  <div className="text-[10px] mt-1" style={{ color: 'var(--t3)' }}>
                    آخر رد: {new Date(selected.replied_at).toLocaleString('ar-SA')}
                  </div>
                )}
              </div>

              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.12em] mb-1.5"
                  style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
                >
                  ملاحظة داخلية (لا تظهر للمستخدم)
                </div>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  rows={2}
                  placeholder="ملاحظة خاصة بفريق الدعم"
                  className="w-full text-[13px]"
                  style={{
                    padding:    '10px 12px',
                    resize:     'vertical',
                    background: 'rgba(245, 183, 28, 0.05)',
                    fontFamily: 'var(--sans)',
                  }}
                />
              </div>
            </div>

            <div
              className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
              style={{ borderTop: '1px solid var(--b1)', background: 'var(--bg2)' }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => deleteTicket(selected.id)}
                  className="px-3 py-1.5 rounded text-[11px]"
                  style={{
                    background: 'transparent',
                    color:      'var(--rd)',
                    border:     '1px solid rgba(198,57,57,0.3)',
                  }}
                >
                  حذف
                </button>
                {saveMsg && (
                  <span
                    className="text-[11px]"
                    style={{ color: saveMsg === 'تم الحفظ' ? 'var(--gr)' : 'var(--rd)' }}
                  >
                    {saveMsg}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-1.5 rounded text-[12px]"
                  style={{ background: 'transparent', color: 'var(--t2)', border: '1px solid var(--b2)' }}
                >
                  إغلاق
                </button>
                <button
                  onClick={() => updateTicket({ admin_reply: replyText, admin_note: noteText })}
                  disabled={saving}
                  className="px-4 py-1.5 rounded text-[12px] font-medium"
                  style={{
                    background: saving ? 'var(--bg4)' : 'var(--tx)',
                    color:      saving ? 'var(--t3)' : 'var(--bg)',
                    cursor:     saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'جار الحفظ' : 'حفظ الرد والملاحظة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  emphasis,
}: {
  label:    string
  value:    number
  color:    string
  emphasis?: boolean
}) {
  return (
    <div
      className="card p-3"
      style={{
        background:  emphasis && value > 0 ? 'rgba(198,57,57,0.08)' : '#fff',
        borderColor: emphasis && value > 0 ? 'rgba(198,57,57,0.2)'  : undefined,
      }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.1em] mb-1"
        style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
      >
        {label}
      </div>
      <div className="mono-num text-[20px] font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

function Meta({
  label,
  value,
  mono,
  ltr,
}: {
  label: string
  value: string
  mono?: boolean
  ltr?:  boolean
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.1em] mb-0.5"
        style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
      >
        {label}
      </div>
      <div
        className={'text-[12px] ' + (mono ? 'mono-num' : '')}
        style={{ color: 'var(--tx)' }}
        dir={ltr ? 'ltr' : undefined}
      >
        {value}
      </div>
    </div>
  )
}
