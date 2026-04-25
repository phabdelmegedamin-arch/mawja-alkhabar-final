'use client'
import { useEffect, useState } from 'react'
import type { AnalysisResult } from '@/types'
import { DB } from '@/data/market-db'

interface Props { result: AnalysisResult }

/* ═══════════════════════════════════════════════════════
   كارت النتيجة الأسود — مطابق لـ v7 HTML بالكامل
   ═══════════════════════════════════════════════════════ */
export default function SentimentCard({ result }: Props) {
  const { sentiment, primary } = result
  const abs = Math.abs(sentiment.score)
  const dir = sentiment.dir
  const [displayScore, setDisplayScore] = useState(0)

  /* أنيميشن العدّ */
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

  /* نصوص ديناميكية */
  const sentLabelAr = dir === 'pos' ? 'إيجابي' : dir === 'neg' ? 'سلبي' : 'محايد'
  const sentLabelEn = dir === 'pos' ? 'POSITIVE' : dir === 'neg' ? 'NEGATIVE' : 'NEUTRAL'
  const intensity   = abs > 60 ? 'مرتفعة' : abs > 35 ? 'متوسطة' : abs > 10 ? 'منخفضة' : 'ضعيفة'
  const intensityEn = abs > 60 ? 'HIGH CONFIDENCE' : abs > 35 ? 'MEDIUM CONFIDENCE' : 'LOW CONFIDENCE'
  const horizon     = abs > 55 ? 'قصير الأجل' : abs > 30 ? 'متوسط الأجل' : 'طويل الأجل'
  const tone        = result.usedAI ? 'مؤسسية' : 'تحليلية'

  /* السهم المحوري لإظهاره في الملخص */
  const originName = result.networkResult?.meta?.originStock?.name
  const originCode = result.originCode

  /* ملخص لغوي */
  const briefIntro =
    dir === 'pos' ? 'إيجابية مؤسسية' :
    dir === 'neg' ? 'سلبية ملحوظة' : 'نبرة محايدة'

  const briefBody =
    dir === 'pos'
      ? '— مؤشرات داعمة لثقة المستثمرين والأسهم المرتبطة'
      : dir === 'neg'
      ? '— ضغط محتمل على الأسهم المرتبطة في القطاع'
      : '— تأثير متوازن دون تحرّك واضح'

  return (
    <aside
      className="flex flex-col justify-between relative overflow-hidden h-full"
      style={{
        padding: '40px 36px',
        background: 'var(--ink)',
        color: 'var(--cream)',
      }}
    >
      {/* ═══ شريط أصفر decoration ═══ */}
      <div
        className="absolute"
        style={{
          top: '40px',
          right: '36px',
          width: '40px',
          height: '4px',
          background: 'var(--amber)',
        }}
      />

      {/* ═══ دائرة decoration ═══ */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-180px',
          left: '-120px',
          width: '340px',
          height: '340px',
          border: '1px solid rgba(244, 239, 230, 0.05)',
          borderRadius: '50%',
        }}
      />

      <div>
        {/* ═══ Header: SENTIMENT label + tag ═══ */}
        <div
          className="flex items-center justify-between"
          style={{ marginTop: '20px', position: 'relative', zIndex: 1 }}
        >
          <span style={{
            fontFamily: 'var(--sans-lat)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'rgba(244, 239, 230, 0.55)',
            letterSpacing: '0.2em',
          }}>
            اتجاه الخبر · SENTIMENT
          </span>
          <span
            className="flex items-center"
            style={{
              gap: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--amber)',
            }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              background: 'var(--amber)',
              borderRadius: '50%',
              display: 'inline-block',
            }} />
            {sentLabelAr}
          </span>
        </div>

        {/* ═══ Body ═══ */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* الرقم الكبير 150px */}
          <div
            className="flex items-start"
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '150px',
              fontWeight: 200,
              lineHeight: 0.85,
              color: 'var(--cream)',
              letterSpacing: '-0.06em',
              margin: '16px 0 10px',
            }}
          >
            {displayScore}
            <small style={{
              fontFamily: 'var(--mono)',
              fontSize: '20px',
              fontWeight: 400,
              color: 'rgba(244, 239, 230, 0.4)',
              marginRight: '6px',
              marginTop: '12px',
            }}>
              %
            </small>
          </div>

          {/* السطر النصي العربي */}
          <div style={{
            fontFamily: 'var(--sans)',
            fontSize: '16px',
            fontWeight: 400,
            color: 'rgba(244, 239, 230, 0.85)',
            marginBottom: '3px',
          }}>
            {sentLabelAr === 'إيجابي' ? 'إيجابية' : sentLabelAr === 'سلبي' ? 'سلبية' : 'حيادية'} الخبر{' '}
            <strong style={{ color: 'var(--amber)', fontWeight: 500 }}>{intensity}</strong>
          </div>

          {/* السطر الإنجليزي */}
          <div style={{
            fontFamily: 'var(--sans-lat)',
            fontSize: '10px',
            color: 'rgba(244, 239, 230, 0.35)',
            letterSpacing: '0.15em',
            marginBottom: '20px',
          }}>
            {sentLabelEn} · {intensityEn}
          </div>

          {/* الملخص اللغوي بين خطين */}
          <p style={{
            fontSize: '13px',
            lineHeight: 1.7,
            color: 'rgba(244, 239, 230, 0.75)',
            padding: '16px 0',
            borderTop: '1px solid rgba(244, 239, 230, 0.12)',
            borderBottom: '1px solid rgba(244, 239, 230, 0.12)',
            fontWeight: 300,
            letterSpacing: '-0.005em',
          }}>
            نبرة <strong style={{ color: 'var(--amber)', fontWeight: 500 }}>{briefIntro}</strong>{' '}
            {briefBody}
            {originName && originCode && (
              <>
                . السهم المحوري:{' '}
                <strong style={{ color: 'var(--amber)', fontWeight: 500 }}>
                  {originName} {originCode}
                </strong>
                .
              </>
            )}
          </p>
        </div>
      </div>

      {/* ═══ شبكة المؤشرات الأربعة ═══ */}
      <div
        className="grid grid-cols-2"
        style={{
          gap: '16px',
          marginTop: '20px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Metric labelEn="CONFIDENCE" value={`${result.confidence}%`} />
        <Metric labelEn="HORIZON"    value={horizon} />
        <Metric labelEn="SECTOR"     value={pData?.label ?? '—'} />
        <Metric labelEn="TONE"       value={tone} />
      </div>
    </aside>
  )
}

/* ═══════════════════════════════════════════════════════ */
function Metric({ labelEn, value }: { labelEn: string; value: string }) {
  return (
    <div className="flex flex-col" style={{ gap: '5px' }}>
      <span style={{
        fontFamily: 'var(--sans-lat)',
        fontSize: '10px',
        fontWeight: 500,
        color: 'rgba(244, 239, 230, 0.45)',
        letterSpacing: '0.15em',
      }}>
        {labelEn}
      </span>
      <span style={{
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--cream)',
      }}>
        {value}
      </span>
    </div>
  )
}
