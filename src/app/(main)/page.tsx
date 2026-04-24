'use client'
import { useEffect } from 'react'
import NewsInput from '@/components/analysis/NewsInput'
import SentimentCard from '@/components/analysis/SentimentCard'
import NetworkImpactPanel from '@/components/analysis/NetworkImpactPanel'
import AutoFeed from '@/components/AutoFeed'
import { useAnalysisStore } from '@/store/analysis'

export default function HomePage() {
  const { result, error, isLoading, setInput, inputText } = useAnalysisStore()

  // عند اختيار خبر من feed — نضعه في حقل الإدخال فقط
  const handleSelectNews = (text: string) => {
    setInput(text)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg)' }}
    >
      <div className="max-w-[1280px] mx-auto px-3 sm:px-6 py-4 sm:py-6">

        {/* ═══ Session bar ═══ */}
        <SessionBar />

        {/* ═══ Main area: Input (right) + Result (left) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6 mt-4">
          {/* Input side */}
          <div className="lg:col-span-2">
            <NewsInput />

            {/* Error display */}
            {error && !isLoading && (
              <div
                className="mt-3 p-3 rounded text-[12px]"
                style={{
                  background: 'var(--rd2)',
                  color:      'var(--rd)',
                  border:     '1px solid rgba(198, 57, 57, 0.2)',
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Result side */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <LoadingCard />
            ) : result ? (
              <SentimentCard result={result} />
            ) : (
              <EmptyResultCard />
            )}
          </div>
        </div>

        {/* ═══ Accordions (Ownership + 3 Waves) — show only if result ═══ */}
        {result && !isLoading && (
          <div className="mb-6 animate-slide-up">
            <NetworkImpactPanel result={result} />
          </div>
        )}

        {/* ═══ Auto news feed ═══ */}
        <div className="mb-6">
          <AutoFeed onSelectNews={handleSelectNews} />
        </div>

      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Session bar — analytics today + timestamp
─────────────────────────────────────────── */
function SessionBar() {
  const { history } = useAnalysisStore()

  // عدد تحليلات اليوم
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = history.filter(h => h.ts?.slice(0, 10) === today).length

  // متوسط الثقة آخر 7 أيام
  const weekAgo = Date.now() - 7 * 86400_000
  const recent  = history.filter(h => new Date(h.ts).getTime() > weekAgo)
  const avgConf = recent.length > 0
    ? Math.round(recent.reduce((s, h) => s + (h.confidence ?? 0), 0) / recent.length)
    : 0

  const now = new Date()
  const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="flex items-center gap-4 sm:gap-6 py-2.5 px-3 sm:px-4 rounded text-[11px] flex-wrap"
      style={{
        background:    'var(--bg2)',
        border:        '1px solid var(--b1)',
        color:         'var(--t2)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="live-dot" />
        <span
          className="uppercase tracking-[0.12em] font-medium"
          style={{ color: 'var(--t2)', fontFamily: 'var(--sans-lat)' }}
        >
          جلسة نشطة
        </span>
      </div>

      <Divider />

      <div className="flex items-center gap-1.5">
        <span style={{ color: 'var(--t3)' }}>قياسات اليوم</span>
        <span className="mono-num font-semibold" style={{ color: 'var(--tx)' }}>
          {todayCount}
        </span>
      </div>

      <Divider />

      <div className="flex items-center gap-1.5">
        <span style={{ color: 'var(--t3)' }}>دقة الأسبوع</span>
        <span className="mono-num font-semibold" style={{ color: avgConf > 0 ? 'var(--ac)' : 'var(--t3)' }}>
          {avgConf > 0 ? `${avgConf}%` : '—'}
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 mono-num" style={{ color: 'var(--t3)' }}>
        <span>{time}</span>
        <span>·</span>
        <span>الرياض</span>
      </div>
    </div>
  )
}

function Divider() {
  return (
    <div
      className="w-px h-3"
      style={{ background: 'var(--b1)' }}
    />
  )
}

/* ─────────────────────────────────────────
   Empty state — before any analysis
─────────────────────────────────────────── */
function EmptyResultCard() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[380px]"
      style={{
        background:   '#0F0F0F',
        color:        'rgba(244, 239, 230, 0.56)',
        borderRadius: 'var(--r-xl)',
      }}
    >
      <div
        className="mb-5"
        style={{ color: 'rgba(244, 239, 230, 0.20)' }}
      >
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="14" cy="28" r="3" fill="#C79012" />
          <path d="M 22 28 Q 28 20, 34 28 T 46 28"
                stroke="rgba(244,239,230,0.3)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 22 28 Q 28 22, 34 28 T 46 28"
                stroke="rgba(244,239,230,0.5)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 22 28 Q 28 24, 34 28 T 46 28"
                stroke="rgba(244,239,230,0.85)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      <div
        className="text-[11px] uppercase tracking-[0.2em] mb-2"
        style={{ color: '#F5B71C', fontFamily: 'var(--sans-lat)' }}
      >
        جاهز للقياس
      </div>

      <h3
        className="text-[18px] font-medium mb-2"
        style={{ color: '#F4EFE6' }}
      >
        أدخل خبراً لقياس اتجاهه
      </h3>

      <p className="text-[12.5px] max-w-xs leading-relaxed mb-6">
        ستظهر هنا: الاتجاه العام، القطاع الرئيسي، سرعة الانتشار، وعدد الأسهم المتأثرة
      </p>

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.15em]"
           style={{ color: 'rgba(244,239,230,0.35)', fontFamily: 'var(--sans-lat)' }}>
        <span>← قياس فوري</span>
        <span>·</span>
        <span>شبكة ملكية</span>
        <span>·</span>
        <span>3 موجات</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Loading state
─────────────────────────────────────────── */
function LoadingCard() {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 h-full min-h-[380px]"
      style={{
        background:   '#0F0F0F',
        borderRadius: 'var(--r-xl)',
      }}
    >
      <div
        className="mb-5 animate-spin"
        style={{
          width:   32,
          height:  32,
          border:  '2px solid rgba(244,239,230,0.12)',
          borderTopColor: '#F5B71C',
          borderRadius:   '50%',
        }}
      />
      <div
        className="text-[11px] uppercase tracking-[0.2em]"
        style={{ color: '#F5B71C', fontFamily: 'var(--sans-lat)' }}
      >
        جارٍ القياس…
      </div>
      <div
        className="text-[11px] mt-1.5"
        style={{ color: 'rgba(244,239,230,0.40)' }}
      >
        تحليل + شبكة ملكية + 3 موجات
      </div>
    </div>
  )
}
