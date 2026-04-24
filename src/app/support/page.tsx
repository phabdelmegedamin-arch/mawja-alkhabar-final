'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'

const CATEGORIES = [
  { id: 'technical',  label: 'مشكلة فنية',        desc: 'عطل، خطأ، صفحة لا تعمل' },
  { id: 'billing',    label: 'اشتراك ودفع',       desc: 'فاتورة، تفعيل، تمديد' },
  { id: 'suggestion', label: 'اقتراح أو ملاحظة',  desc: 'ميزة تريدها أو تحسين' },
  { id: 'bug',        label: 'خطأ في التحليل',    desc: 'نتيجة غير دقيقة أو غريبة' },
  { id: 'general',    label: 'استفسار عام',        desc: 'أي سؤال آخر' },
]

export default function SupportPage() {
  const { session } = useAuthStore()

  const [form, setForm] = useState({
    name:     session?.name  ?? '',
    email:    session?.email ?? '',
    phone:    '',
    category: 'general',
    subject:  '',
    message:  '',
  })
  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [ticketNo,    setTicketNo]    = useState<number | null>(null)
  const [error,       setError]       = useState('')

  const handleSubmit = async () => {
    setError('')
    if (!form.name.trim())    return setError('الاسم مطلوب')
    if (!form.email.trim())   return setError('البريد الإلكتروني مطلوب')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('البريد الإلكتروني غير صحيح')
    if (form.subject.trim().length < 5)  return setError('الموضوع قصير جداً')
    if (form.message.trim().length < 15) return setError('الرسالة قصيرة — 15 حرف على الأقل')

    setLoading(true)
    try {
      const res  = await fetch('/api/support', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, userId: session?.id ?? null }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
        setTicketNo(data.data?.ticket_no ?? null)
      } else {
        setError(data.error ?? 'حدث خطأ — حاول لاحقاً')
      }
    } catch {
      setError('تعذّر الاتصال بالخادم')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--bg)' }}
      >
        <div
          className="card p-8 max-w-md w-full text-center"
          style={{ background: '#fff' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--gr2)' }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M7 14 L12 19 L21 9" stroke="var(--gr)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div
            className="text-[11px] uppercase tracking-[0.18em] mb-2"
            style={{ color: 'var(--gr)', fontFamily: 'var(--sans-lat)' }}
          >
            تم الاستلام
          </div>

          <h2 className="text-[20px] font-medium mb-2" style={{ color: 'var(--tx)' }}>
            وصلت رسالتك
          </h2>

          {ticketNo && (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded mb-4"
              style={{ background: 'var(--ac2)' }}
            >
              <span className="text-[11px]" style={{ color: 'var(--t2)' }}>رقم التذكرة</span>
              <span className="mono-num text-[14px] font-semibold" style={{ color: 'var(--ac)' }}>
                #{String(ticketNo).padStart(5, '0')}
              </span>
            </div>
          )}

          <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'var(--t2)' }}>
            سنرد عليك عبر البريد الإلكتروني خلال 24 ساعة عادةً.
            <br />
            احتفظ برقم التذكرة للمراجعة.
          </p>

          <div className="flex gap-2 justify-center">
            <Link
              href="/"
              className="px-5 py-2 rounded text-[13px] font-medium transition-colors"
              style={{ background: 'var(--tx)', color: 'var(--bg)' }}
            >
              العودة للرئيسية
            </Link>
            <button
              onClick={() => {
                setSuccess(false); setTicketNo(null)
                setForm(f => ({ ...f, subject: '', message: '' }))
              }}
              className="px-5 py-2 rounded text-[13px] transition-colors"
              style={{
                background: 'transparent',
                color:      'var(--t2)',
                border:     '1px solid var(--b2)',
              }}
            >
              إرسال آخر
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg)' }}
    >
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] mb-3 hover:underline"
            style={{ color: 'var(--t2)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2 L4 6 L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>الرئيسية</span>
          </Link>

          <div
            className="text-[11px] uppercase tracking-[0.18em] mb-1"
            style={{ color: 'var(--ac)', fontFamily: 'var(--sans-lat)' }}
          >
            مركز المساعدة
          </div>
          <h1 className="text-[24px] font-medium mb-2" style={{ color: 'var(--tx)' }}>
            الدعم الفني
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--t2)' }}>
            أخبرنا بمشكلتك أو اقتراحك — نرد عادةً خلال 24 ساعة.
          </p>
        </div>

        {/* Form */}
        <div
          className="card p-5 sm:p-6"
          style={{ background: '#fff' }}
        >

          {/* Name + email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Field label="الاسم *">
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="اسمك الكامل"
                className="w-full"
              />
            </Field>
            <Field label="البريد الإلكتروني *">
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                dir="ltr"
                className="w-full"
              />
            </Field>
          </div>

          {/* Phone (optional) */}
          <Field label="رقم الجوال (اختياري)">
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+966 5X XXX XXXX"
              dir="ltr"
              className="w-full"
            />
          </Field>

          {/* Category */}
          <div className="mb-4 mt-4">
            <div
              className="text-[11px] mb-2 uppercase tracking-[0.1em]"
              style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
            >
              نوع الطلب *
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map(cat => {
                const active = form.category === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setForm({ ...form, category: cat.id })}
                    className="p-2.5 rounded text-right transition-colors"
                    style={{
                      background: active ? 'var(--ac2)' : 'var(--bg3)',
                      border:     active ? '1px solid var(--ac)' : '1px solid var(--b1)',
                    }}
                  >
                    <div
                      className="text-[13px] font-medium"
                      style={{ color: active ? 'var(--ac)' : 'var(--tx)' }}
                    >
                      {cat.label}
                    </div>
                    <div
                      className="text-[11px] mt-0.5"
                      style={{ color: active ? 'var(--ac)' : 'var(--t3)' }}
                    >
                      {cat.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subject */}
          <Field label="الموضوع *">
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              placeholder="ملخص قصير للمشكلة (مثال: خطأ في تحليل خبر أرامكو)"
              maxLength={120}
              className="w-full"
            />
          </Field>

          {/* Message */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div
                className="text-[11px] uppercase tracking-[0.1em]"
                style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
              >
                الرسالة *
              </div>
              <span
                className="mono-num text-[10px]"
                style={{ color: 'var(--t3)' }}
              >
                {form.message.length} / 2000
              </span>
            </div>
            <textarea
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value.slice(0, 2000) })}
              placeholder="اشرح المشكلة بالتفصيل — الخطوات التي أدّت إليها، المتصفح، الوقت، وأي معلومات مفيدة."
              rows={6}
              className="w-full"
              style={{
                resize:     'vertical',
                fontFamily: 'var(--sans)',
                padding:    '10px 12px',
                fontSize:   '13px',
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="p-2.5 rounded mb-3 text-[12px]"
              style={{
                background: 'var(--rd2)',
                color:      'var(--rd)',
                border:     '1px solid rgba(198,57,57,0.2)',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between gap-3 flex-wrap mt-5">
            <p className="text-[11px] flex-1 min-w-[200px]" style={{ color: 'var(--t3)' }}>
              سنحتفظ برسالتك بسرية — لن تُشارك مع أي طرف ثالث.
            </p>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded text-[13px] font-medium transition-colors"
              style={{
                background: loading ? 'var(--bg4)' : 'var(--tx)',
                color:      loading ? 'var(--t3)'  : 'var(--bg)',
                cursor:     loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'جارٍ الإرسال…' : 'إرسال الرسالة ←'}
            </button>
          </div>
        </div>

        {/* Contact alternatives */}
        <div
          className="mt-5 p-4 rounded text-[12px] flex items-start gap-3"
          style={{ background: 'var(--bg2)', border: '1px solid var(--b1)' }}
        >
          <div
            className="w-6 h-6 rounded flex items-center justify-center shrink-0"
            style={{ background: 'var(--ac2)', color: 'var(--ac)' }}
          >
            ✉
          </div>
          <div className="flex-1">
            <div className="font-medium mb-1" style={{ color: 'var(--tx)' }}>
              وسائل أخرى للتواصل
            </div>
            <p style={{ color: 'var(--t2)' }}>
              البريد: <span className="mono-num" dir="ltr">support@mawja-alkhabar.com</span>
              <br />
              الأوقات: السبت – الخميس، 9 ص – 6 م (توقيت الرياض)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Reusable field wrapper */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div
        className="text-[11px] mb-1.5 uppercase tracking-[0.1em]"
        style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
