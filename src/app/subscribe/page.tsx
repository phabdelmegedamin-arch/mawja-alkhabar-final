'use client'
import { useState } from 'react'

type Step = 1 | 2 | 3 | 4
type Plan = 'monthly' | 'yearly' | null

const PRICES = { monthly: 49, yearly: 499, vat: 0.15 }

export default function SubscribePage() {
  const [step, setStep]       = useState<Step>(1)
  const [plan, setPlan]       = useState<Plan>(null)
  const [loading, setLoad]    = useState(false)
  const [err, setErr]         = useState('')
  const [form, setForm]       = useState({
    name:'', email:'', username:'', phone:'', password:'', password2:''
  })
  const [promoCode, setPromoCode]       = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoErr, setPromoErr]         = useState('')
  const [promoSuccess, setPromoSuccess] = useState('')

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const validate1 = () => {
    if (!form.name || form.name.length < 2) return 'أدخل اسمك الكامل'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'بريد إلكتروني غير صحيح'
    if (!form.username || form.username.length < 4) return 'اسم المستخدم 4 أحرف على الأقل'
    if (!form.phone.match(/^[0-9+]{9,15}$/)) return 'رقم جوال غير صحيح'
    if (!form.password || form.password.length < 8) return 'كلمة المرور 8 أحرف على الأقل'
    if (form.password !== form.password2) return 'كلمتا المرور غير متطابقتين'
    return ''
  }

  const handleStep1 = () => {
    const e = validate1()
    if (e) { setErr(e); return }
    setErr(''); setStep(2)
  }

  const handleStep2 = () => {
    if (!plan) { setErr('اختر باقة'); return }
    setErr(''); setStep(3)
  }

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) { setPromoErr('أدخل الكود أولاً'); return }
    setPromoLoading(true); setPromoErr(''); setPromoSuccess('')
    try {
      const res  = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim() }),
      })
      const data = await res.json()
      if (!data.valid) throw new Error(data.error || 'الكود غير صحيح أو منتهي الصلاحية')
      setPromoApplied(true)
      setPromoSuccess('✅ تم تطبيق الكود! الاشتراك مجاني')
    } catch (e: any) {
      setPromoErr(e.message)
      setPromoApplied(false)
    }
    setPromoLoading(false)
  }

  const removePromo = () => {
    setPromoCode(''); setPromoApplied(false)
    setPromoErr(''); setPromoSuccess('')
  }

  const handlePay = async () => {
    setLoad(true); setErr('')
    try {
      const basePrice = plan ? PRICES[plan] : 0
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, plan,
          amount:    promoApplied ? 0 : basePrice,
          promoCode: promoApplied ? promoCode.trim() : null,
          isFree:    promoApplied,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setStep(4)
    } catch (e: any) { setErr(e.message) }
    setLoad(false)
  }

  const basePrice = plan ? PRICES[plan] : 0
  const price     = promoApplied ? 0 : basePrice
  const vat       = promoApplied ? 0 : +(basePrice * 0.15).toFixed(2)
  const total     = promoApplied ? 0 : +(basePrice * 1.15).toFixed(2)

  const STEP_LABELS = ['إنشاء حساب','اختر الباقة','الدفع','تم! ✓']

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="sticky top-0 bg-bg2 border-b border-b-1 px-4 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <span className="text-ac font-black text-lg">〜</span>
          <span className="font-black"><span className="text-tx">موجة</span> <em className="text-ac not-italic">الخبر</em></span>
        </a>
        <a href="/" className="text-xs text-tx-3 hover:text-tx border border-b-2 px-3 py-1.5 rounded-lg">✕ إغلاق</a>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Steps bar */}
        <div className="flex items-center mb-8">
          {STEP_LABELS.map((label, i) => {
            const n      = i + 1
            const done   = step > n
            const active = step === n
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all
                    ${done   ? 'bg-ac text-bg'
                    : active ? 'bg-ac/20 text-ac border-2 border-ac'
                    :          'bg-bg3 text-tx-3'}`}>
                    {done ? '✓' : n}
                  </div>
                  <span className={`text-2xs mt-1 ${active ? 'text-ac' : 'text-tx-3'}`}>{label}</span>
                </div>
                {i < 3 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? 'bg-ac' : 'bg-b-1'}`} />}
              </div>
            )
          })}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-black">إنشاء <span className="text-ac">حسابك</span></h2>
            <p className="text-xs text-tx-3">خطوة واحدة للوصول لأقوى أداة تحليل للأسواق السعودية</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label:'الاسم الكامل *',        key:'name',      type:'text',     ph:'محمد عبدالله',   dir:'rtl' },
                { label:'البريد الإلكتروني *',    key:'email',     type:'email',    ph:'you@example.com',dir:'ltr' },
                { label:'اسم المستخدم *',         key:'username',  type:'text',     ph:'mohammed123',    dir:'ltr' },
                { label:'رقم الجوال (واتساب) *', key:'phone',     type:'tel',      ph:'966501234567',   dir:'ltr' },
                { label:'كلمة المرور *',          key:'password',  type:'password', ph:'••••••••',       dir:'ltr' },
                { label:'تأكيد كلمة المرور *',   key:'password2', type:'password', ph:'••••••••',       dir:'ltr' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-tx-3 block mb-1">{f.label}</label>
                  <input type={f.type} value={form[f.key as keyof typeof form]}
                    onChange={setF(f.key as keyof typeof form)}
                    placeholder={f.ph} dir={f.dir as any}
                    className="w-full px-3 py-2.5 text-sm rounded-lg" />
                </div>
              ))}
            </div>
            {err && <p className="text-rd text-xs">{err}</p>}
            <button onClick={handleStep1}
              className="w-full py-3 rounded-lg bg-ac text-bg font-bold text-sm hover:bg-ac/90">
              التالي — اختر الباقة ←
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-black">اختر <span className="text-ac">باقتك</span></h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div onClick={() => setPlan('monthly')}
                className={`card p-5 cursor-pointer transition-all ${plan === 'monthly' ? 'border-ac bg-ac/5' : 'hover:border-b-3'}`}>
                <div className="text-base font-bold mb-1">شهري</div>
                <div className="text-3xl font-black text-ac mb-0.5">49 <span className="text-base font-normal text-tx-3">ر.س</span></div>
                <div className="text-2xs text-tx-3 mb-3">+ 15% ضريبة</div>
                <ul className="space-y-1 text-xs text-tx-2">
                  {['✅ كامل 153 سهم','✅ أخبار لحظية','✅ تحليل فوري'].map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
              <div onClick={() => setPlan('yearly')}
                className={`card p-5 cursor-pointer transition-all relative ${plan === 'yearly' ? 'border-ac bg-ac/5' : 'hover:border-b-3'}`}>
                <div className="absolute -top-3 right-4 bg-ac text-bg text-2xs font-black px-2 py-0.5 rounded-full">الأوفر 🔥</div>
                <div className="text-base font-bold mb-1">سنوي</div>
                <div className="text-3xl font-black text-ac mb-0.5">399 <span className="text-base font-normal text-tx-3">ر.س</span></div>
                <div className="text-2xs text-tx-3 mb-3">+ 15% ضريبة — وفّر 32%</div>
                <ul className="space-y-1 text-xs text-tx-2">
                  {['✅ كامل 153 سهم','✅ أخبار لحظية','✅ تحليل فوري','✅ أولوية الدعم'].map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            </div>
            {err && <p className="text-rd text-xs">{err}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-[0.4] py-3 rounded-lg border border-b-2 text-sm">← رجوع</button>
              <button onClick={handleStep2} className="flex-1 py-3 rounded-lg bg-ac text-bg font-bold text-sm">التالي — الدفع ←</button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-black">تأكيد <span className="text-ac">الدفع</span></h2>

            {/* ملخص */}
            <div className="bg-bg3 rounded-lg p-4 space-y-2.5">
              <div className="text-xs font-bold text-ac mb-2">📋 ملخص الطلب</div>
              <div className="flex justify-between text-sm">
                <span className="text-tx-3">المستخدم</span><span>{form.username}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-tx-3">الباقة</span>
                <span>موجة الخبر — {plan === 'monthly' ? 'شهري' : 'سنوي'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-tx-3">السعر</span>
                {promoApplied
                  ? <span className="line-through text-tx-3">{basePrice} ر.س</span>
                  : <span>{basePrice} ر.س</span>}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-tx-3">الضريبة (15%)</span>
                <span>{promoApplied ? '—' : `${vat} ر.س`}</span>
              </div>
              <div className="h-px bg-b-1 my-1" />
              <div className="flex justify-between font-black text-base">
                <span>الإجمالي</span>
                <span className={promoApplied ? 'text-green-400' : 'text-ac'}>
                  {promoApplied ? '🎉 مجاني' : `${total} ر.س`}
                </span>
              </div>
            </div>

            {/* حقل الكود */}
            <div className="border border-b-2 rounded-lg p-4 space-y-2">
              <label className="text-xs font-bold text-tx-2 block">🎟️ هل لديك كود مجاني؟</label>
              {!promoApplied ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoErr('') }}
                    placeholder="أدخل الكود هنا"
                    dir="ltr"
                    className="flex-1 px-3 py-2 text-sm rounded-lg tracking-widest font-mono uppercase"
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={promoLoading}
                    className="px-4 py-2 rounded-lg bg-ac text-bg text-sm font-bold disabled:opacity-50 whitespace-nowrap"
                  >
                    {promoLoading ? '⏳' : 'تطبيق'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-bold text-ac tracking-widest">{promoCode}</span>
                  <button onClick={removePromo} className="text-xs text-tx-3 hover:text-rd underline">إزالة</button>
                </div>
              )}
              {promoErr     && <p className="text-rd text-xs">{promoErr}</p>}
              {promoSuccess && <p className="text-green-400 text-xs">{promoSuccess}</p>}
            </div>

            {promoApplied
              ? <p className="text-xs text-green-400 text-center">✨ اشتراكك مجاني بالكامل — سيُفعَّل حسابك فور الضغط على الزر</p>
              : <p className="text-xs text-tx-3 text-center">سيتم تحويلك لبوابة ميسر الآمنة — بعد الدفع يُفعَّل حسابك خلال دقائق</p>
            }

            {err && <p className="text-rd text-xs text-center">{err}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-[0.4] py-3 rounded-lg border border-b-2 text-sm">← رجوع</button>
              <button onClick={handlePay} disabled={loading}
                className="flex-1 py-3 rounded-lg bg-ac text-bg font-bold text-sm disabled:opacity-50">
                {loading ? '⏳ جارٍ...' : promoApplied ? '✅ تفعيل مجاني ←' : '💳 الدفع عبر ميسر ←'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-black mb-2">تم إرسال طلبك!</h2>
            <p className="text-sm text-tx-3 max-w-sm mx-auto mb-6">
              {promoApplied
                ? 'تم تفعيل حسابك مجاناً! ستصلك رسالة تأكيد على واتساب.'
                : 'سيتم مراجعة دفعتك وتفعيل حسابك خلال دقائق. ستصلك رسالة على واتساب عند التفعيل.'}
            </p>
            <a href="/" className="inline-block px-8 py-3 rounded-lg bg-ac text-bg font-bold text-sm">
              العودة للتطبيق ←
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
