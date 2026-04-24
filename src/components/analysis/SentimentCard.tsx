'use client'
import { useEffect, useState } from 'react'
import { sentimentLabel } from '@/lib/utils'
import type { AnalysisResult } from '@/types'
import { DB } from '@/data/market-db'

interface Props { result: AnalysisResult }

/* ═══════════════════════════════════════════════════════
   كارت النتيجة — مطابق لتصميم v7 HTML الأصلي
   - الرقم بحجم ضخم (150px) خفيف
   - شريط أصفر صغير في الزاوية اليمنى العلوية
   - تصنيف نصي + سطر إنجليزي مرتب
   - ملخص لغوي مختصر داخل خطين فاصلين
   - 4 مؤشرات: CONFIDENCE / HORIZON / SECTOR / TONE
   ═══════════════════════════════════════════════════════ */
export default function SentimentCard({ result }: Props) {
  const { sentiment, primary, stocks } = result
  const abs = Math.abs(sentiment.score)
  const dir = sentiment.dir
  const [displayScore, setDisplayScore] = useState(0)

  /* أنيميشن للرقم */
  useEffect(() => {
    setDisplayScore(0)
    const step  = Math.max(1, Math.ceil(abs / 22))
    const timer = setInterval(() => {
      setDisplayScore(prev => {
        const next = prev + step
        if (next >= abs) { clearInterval(timer); return abs }
        return next
      })
    }, 24)
    return () => clearInterval(timer)
  }, [abs])

  const pData = (DB as Record<string, { label: string; icon: string }>)[primary]

  /* الألوان داخل البلوك الأسود */
  const cream     = '#F4EFE6'
  const creamDim  = 'rgba(244, 239, 230, 0.85)'
  const creamMid  = 'rgba(244, 239, 230, 0.55)'
  const creamFaint= 'rgba(244, 239, 230, 0.45)'
  const creamSoft = 'rgba(244, 239, 230, 0.35)'
  const creamLine = 'rgba(244, 239, 230, 0.12)'
  const amber     = '#F5B71C'

  /* تسميات */
  const sentLabel = dir === 'pos' ? 'إيجابي' : dir === 'neg' ? 'سلبي' : 'محايد'
  const sentLabelEn = dir === 'pos' ? 'POSITIVE' : dir === 'neg' ? 'NEGATIVE' : 'NEUTRAL'
  const intensityAr = abs > 60 ? 'مرتفعة' : abs > 35 ? 'متوسطة' : abs > 10 ? 'منخفضة' : 'ضعيفة'
  const intensityEn = abs > 60 ? 'HIGH CONFIDENCE' : abs > 35 ? 'MEDIUM CONFIDENCE' : 'LOW CONFIDENCE'

  /* أفق التحليل */
  const horizon = abs > 55 ? 'قصير الأجل' : abs > 30 ? 'متوسط الأجل' : 'طويل الأجل'

  /* النبرة */
  const tone = result.usedAI ? 'مؤسسية' : 'تحليلية'

  /* السهم المحوري لإظهاره في الملخص */
  const originName = result.networkResult?.meta?.originStock?.name
  const originCode = result.originCode

  /* ملخص لغوي مختصر */
  const briefIntro =
    dir === 'pos' ? 'إيجابية مؤسسية' :
    dir === 'neg' ? 'سلبية ملحوظة' : 'نبرة محايدة'

  const briefBody =
    dir === 'pos'
      ? '— تشير المؤشرات إلى تأثير داعم على ثقة المستثمرين والأسهم المرتبطة'
      : dir === 'neg'
      ? '— تشير المؤشرات إلى ضغط محتمل على الأسهم المرتبطة في القطاع'
      : '— تشير المؤشرات إلى تأثير متوازن دون تحرّك واضح في الاتجاه'

  return (
    <div
      className="flex flex-col overflow-hidden relative h-full"
      style={{
        background:   '#0F0F0F',
        borderRadius: 'var(--r-xl)',
        minHeight:    '100%',
        color:        cream,
      }}
    >
      {/* ─── الشريط الأصفر العلوي (decoration) ─── */}
      <div
        className="absolute top-[36px] right-[28px] w-[40px] h-[3px]"
        style={{ background: amber }}
      />

      {/* ─── دائرة decoration في الزاوية السفلى اليسرى ─── */}
      <div
        className="absolute bottom-[-180px] left-[-120px] w-[340px] h-[340px] rounded-full pointer-events-none"
        style={{ border: `1px solid ${creamLine}` }}
      />

      {/* ─── المحتوى ─── */}
      <div className="flex-1 flex flex-col justify-between p-7 relative z-10">

        {/* ═══ التوب: SENTIMENT label + tag ═══ */}
        <div>
          <div className="flex items-center justify-between mb-3 mt-3">
            <span
              className="text-[10px] uppercase"
              style={{
                color: creamMid,
                letterSpacing: '0.2em',
                fontFamily: 'var(--sans-lat)',
                fontWeight: 500,
              }}
            >
              اتجاه الخبر · SENTIMENT
            </span>
            <span
              className="flex items-center gap-2 text-[12px] font-medium"
              style={{ color: amber }}
            >
              <span
                className="inline-block w-[6px] h-[6px] rounded-full"
                style={{ background: amber }}
              />
              {sentLabel}
            </span>
          </div>

          {/* ═══ الرقم الضخم 85% ═══ */}
          <div className="flex items-start mt-4 mb-2">
            <span
              className="mono-num"
              style={{
                fontSize:      '120px',
                fontWeight:    200,
                lineHeight:    0.85,
                letterSpacing: '-0.06em',
                color:         cream,
              }}
            >
              {displayScore}
            </span>
            <span
              className="mono-num"
              style={{
                fontSize: '18px',
                fontWeight: 400,
                color: creamFaint,
                marginRight: '6px',
                marginTop: '10px',
              }}
            >
              %
            </span>
          </div>

          {/* ═══ السطر النصي تحت الرقم ═══ */}
          <div
            className="text-[15px] mb-1"
            style={{ color: creamDim }}
          >
            {sentLabel === 'إيجابي' ? 'إيجابية' : sentLabel === 'سلبي' ? 'سلبية' : 'حيادية'} الخبر{' '}
            <strong style={{ color: amber, fontWeight: 500 }}>{intensityAr}</strong>
          </div>

          <div
            className="text-[10px] uppercase mb-5"
            style={{
              color: creamSoft,
              letterSpacing: '0.15em',
              fontFamily: 'var(--sans-lat)',
            }}
          >
            {sentLabelEn} · {intensityEn}
          </div>

          {/* ═══ ملخص لغوي مختصر بين خطين ═══ */}
          <div
            className="text-[13px] py-4 my-2"
            style={{
              color: creamDim,
              borderTop: `1px solid ${creamLine}`,
              borderBottom: `1px solid ${creamLine}`,
              lineHeight: 1.7,
              fontWeight: 300,
              letterSpacing: '-0.005em',
            }}
          >
            نبرة <strong style={{ color: amber, fontWeight: 500 }}>{briefIntro}</strong> {briefBody}
            {originName && originCode && (
              <>
                . السهم المحوري:{' '}
                <strong style={{ color: amber, fontWeight: 500 }}>
                  {originName} {originCode}
                </strong>
                .
              </>
            )}
          </div>
        </div>

        {/* ═══ شبكة المؤشرات الأربعة ═══ */}
        <div className="grid grid-cols-2 gap-4 mt-5">
          <Metric
            labelEn="CONFIDENCE"
            value={`${result.confidence}%`}
            mono
          />
          <Metric
            labelEn="HORIZON"
            value={horizon}
          />
          <Metric
            labelEn="SECTOR"
            value={pData?.label ?? '—'}
          />
          <Metric
            labelEn="TONE"
            value={tone}
          />
        </div>
      </div>

      {/* ─── AI insight footer (لو موجود) ─── */}
      {result.insight && (
        <div
          className="px-7 py-4 relative z-10"
          style={{
            background:  'rgba(245, 183, 28, 0.06)',
            borderTop:   `1px solid ${creamLine}`,
          }}
        >
          <div
            className="text-[10px] uppercase mb-1.5 flex items-center gap-1.5"
            style={{
              color: amber,
              letterSpacing: '0.18em',
              fontFamily: 'var(--sans-lat)',
            }}
          >
            <span>✦</span> قراءة Claude
          </div>
          <p
            className="text-[12.5px]"
            style={{
              color: 'rgba(244, 239, 230, 0.88)',
              lineHeight: 1.6,
            }}
          >
            {result.insight}
          </p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   مكوّن مؤشر فردي — تسمية إنجليزية + قيمة
   ═══════════════════════════════════════════════ */
function Metric({
  labelEn, value, mono,
}: {
  labelEn: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="text-[10px] uppercase"
        style={{
          color: 'rgba(244, 239, 230, 0.45)',
          letterSpacing: '0.15em',
          fontFamily: 'var(--sans-lat)',
          fontWeight: 500,
        }}
      >
        {labelEn}
      </div>
      <div
        className={`text-[13px] font-medium ${mono ? 'mono-num' : ''}`}
        style={{ color: '#F4EFE6' }}
      >
        {value}
      </div>
    </div>
  )
}
