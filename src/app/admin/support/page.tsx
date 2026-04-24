'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'

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
  priority:    'low' | 'normal' | 'high' | 'urgent'
  status:      'open' | 'in_progress' | 'resolved' | 'closed'
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

const STATUS_META: Record<Ticket['status'], { label: string; color: string; bg: string }> = {
  open:        { label: 'مفتوحة',       color: 'var(--rd)', bg: 'var(--rd2)' },
  in_progress: { label: 'قيد المعالجة',  color: 'var(--yl)', bg: 'var(--yl2)' },
  resolved:    { label: 'محلولة',       color: 'var(--gr)', bg: 'var(--gr2)' },
  closed:      { label: 'مغلقة',        color: 'var(--t2)', bg: 'var(--bg3)' },
}

const PRIORITY_META: Record<Ticket['priority'], { label: string; color: string }> = {
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

  const [fStatus,   setFStatus]   = useState<string>('all')
  const [fPriority, setFPriority] = useState<string>('all')
  const [fCategory, setFCategory] = useState<string>('all')
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

      const res  = await fetch(`/api/admin/support?${params.toString()}`)
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
        setSaveMsg(data.error || 'تعذّر الحفظ')
      }
    } catch {
      setSaveMsg('خطأ في الاتصال')
    }
    setSaving(false)
  }

  const deleteTicket = async (id: string) => {
    if (!confirm('حذف التذكرة نهائياً؟')) return
    try {
      const res  = await fetch(`/api/admin/support?id=${id}`, { method: 'DELETE' })
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
              className="inline-flex items-center gap-1.5 text-[11px] mb-2 hover:underline"
              style={{ color: 'var(--t2)' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M7 1.5 L3.5 5 L7 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              لوحة الأدمن
            </Link>
            <h1 className="text-[22px] font-medium" style={{ color: 'var(--tx)' }}>
              تذاكر الدعم
            </h1>
          </div>

          <button
            onClick={load}
            className="px-3 py-1.5 rounded text-[12px] transition-colors"
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
            placeholder="ابحث بالموضوع، الاسم، البريد..."
            className="flex-1 min-w-[180px] text-[12px]"
            style={{ padding: '6px 10px' }}
          />
          <FilterSelect
            value={fStatus}
            onChange={setFStatus}
            options={[
              { v: 'all',         l: 'كل الحالات' },
              { v: 'open',        l: 'مفتوحة' },
              { v: 'in_progress', l: 'قيد المعالجة' },
              { v: 'resolved',    l: 'محلولة' },
              { v: 'closed',      l: 'مغلقة' },
            ]}
          />
          <FilterSelect
            value={fPriority}
            onChange={setFPriority}
            options={[
              { v: 'all',    l: 'كل الأولويات' },
              { v: 'urgent', l: 'عاجل' },
              { v: 'high',   l: 'مرتفع' },
              { v: 'normal', l: 'عادي' },
              { v: 'low',    l: 'منخفض' },
            ]}
          />
          <FilterSelect
            value={fCategory}
            onChange={setFCategory}
            options={[
              { v: 'all',        l: 'كل الفئات' },
              { v: 'technical',  l: 'فنية' },
              { v: 'billing',    l: 'دفع' },
              { v: 'suggestion', l: 'اقتراح' },
              { v: 'bug',        l: 'خطأ' },
              { v: 'general',    l: 'عام' },
            ]}
          />
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
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8" style={{ color: 'var(--t3)' }}>
                      جارٍ التحميل...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8" style={{ color: 'var(--t3)' }}>
                      لا توجد تذاكر
                    </td>
                  </tr>
                ) : (
                  tickets.map(t => {
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
                          <div className="text-[11px] truncate max-w-[320px]" style={{ color: 'var(--t3)' }}>
                            {t.message.slice(0, 80)}
                          </div>
                        </td>
                        <td>
                          <div style={{ color: 'var(--tx)', fontSize: 12 }}>{t.name}</div>
                          <div className="mono-num text-[10px]" style={{ color: 'var(--t3)' }} dir="ltr">
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
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <TicketModal
          ticket={selected}
          replyText={replyText}
          setReplyText={setReplyText}
          noteText={noteText}
          setNoteText={setNoteText}
          saving={saving}
          saveMsg={saveMsg}
          onClose={() => setSelected(null)}
          onUpdate={updateTicket}
          onDelete={() => deleteTicket(selected.id)}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Sub-components
─────────────────────────────────────────── */

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

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value:    string
  onChange: (v: string) => void
  options:  { v: string; l: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-[12px]"
      style={{ padding: '6px 10px', background: '#fff' }}
    >
      {options.map(o => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  )
}

/* ─────────────────────────────────────────
   Ticket Modal
─────────────────────────────────────────── */
function TicketModal({
  ticket,
  replyText,
  setReplyText,
  noteText,
  setNoteText,
  saving,
  saveMsg,
  onClose,
  onUpdate,
  onDelete,
}: {
  ticket:       Ticket
  replyText:    string
  setReplyText: (v: string) => void
  noteText:     string
  setNoteText:  (v: string) => void
  saving:       boolean
  saveMsg:      string
  onClose:      () => void
  onUpdate:     (patch: Partial<Ticket>) => void
  onDelete:     () => void
}) {
  const s = STATUS_META[ticket.status]
  const p = PRIORITY_META[ticket.priority]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,15,0.5)' }}
      onClick={onClose}
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
              #{String(ticket.ticket_no).padStart(5, '0')}
            </span>
            <span className="text-[15px] font-medium" style={{ color: 'var(--tx)' }}>
              {ticket.subject}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[22px] leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg3)]"
            style={{ color: 'var(--t2)' }}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Meta label="المرسل" value={ticket.name} />
            <Meta label="البريد" value={ticket.email} mono ltr />
            {ticket.phone && <Meta label="الجوال" value={ticket.phone} mono ltr />}
            <Meta label="الفئة" value={CATEGORY_LABEL[ticket.category] ?? ticket.category} />
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
              {ticket.message}
            </div>
            <div className="text-[10px] mt-1.5" style={{ color: 'var(--t3)' }}>
              {new Date(ticket.created_at).toLocaleString('ar-SA')}
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
                value={ticket.status}
                onChange={e => onUpdate({ status: e.target.value as Ticket['status'] })}
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
                value={ticket.priority}
                onChange={e => onUpdate({ priority: e.target.value as Ticket['priority'] })}
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
              placeholder="اكتب ردك هنا..."
              className="w-full text-[13px]"
              style={{ padding: '10px 12px', resize: 'vertical', fontFamily: 'var(--sans)' }}
            />
            {ticket.replied_at && (
              <div className="text-[10px] mt-1" style={{ color: 'var(--t3)' }}>
                آخر رد: {new Date(ticket.replied_at).toLocaleString('ar-SA')}
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
              placeholder="ملاحظة خاصة بفريق الدعم..."
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
              onClick={onDelete}
              className="px-3 py-1.5 rounded text-[11px] transition-colors"
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
              onClick={onClose}
              className="px-3 py-1.5 rounded text-[12px]"
              style={{ background: 'transparent', color: 'var(--t2)', border: '1px solid var(--b2)' }}
            >
              إغلاق
            </button>
            <button
              onClick={() => onUpdate({ admin_reply: replyText, admin_note: noteText })}
              disabled={saving}
              className="px-4 py-1.5 rounded text-[12px] font-medium"
              style={{
                background: saving ? 'var(--bg4)' : 'var(--tx)',
                color:      saving ? 'var(--t3)' : 'var(--bg)',
                cursor:     saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ الرد والملاحظة'}
            </button>
          </div>
        </div>
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
        className={`text-[12px] ${mono ? 'mono-num' : ''}`}
        style={{ color: 'var(--tx)' }}
        dir={ltr ? 'ltr' : undefined}
      >
        {value}
      </div>
    </div>
  )
}
