'use client'
import { useEffect, useState } from 'react'
import { sentimentLabel } from '@/lib/utils'
import type { AnalysisResult } from '@/types'
import { DB } from '@/data/market-db'

interface Props { result: AnalysisResult }

export default function SentimentCard({ result }: Props) {
  const { sentiment, primary, allSectors, stocks } = result
  const abs = Math.abs(sentiment.score)
  const dir = sentiment.dir
  const [displayScore, setDisplayScore] = useState(0)

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
  const related = allSectors.slice(1, 4)
    .map(k => (DB as Record<string, { label: string }>)[k]?.label)
    .filter(Boolean) as string[]

  const intensity = abs > 60 ? 'عالية' : abs > 35 ? 'متوسطة' : abs > 10 ? 'منخفضة' : 'ضعيفة'
  const speed     = abs > 55 ? 'سريعة' : abs > 30 ? 'متوسطة' : 'بطيئة'

  // الألوان داخل البلوك الأسود
  const sentColor = dir === 'pos' ? '#4ADE80' : dir === 'neg' ? '#F87171' : '#FCD34D'
  const dirSymbol = dir === 'pos' ? '↑' : dir === 'neg' ? '↓' : '◎'
  const cream     = '#F4EFE6'
  const creamDim  = 'rgba(244, 239, 230, 0.56)'
  const creamFaint= 'rgba(244, 239, 230, 0.30)'
  const creamLine = 'rgba(244, 239, 230, 0.12)'

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        background:   '#0F0F0F',
        borderRadius: 'var(--r-xl)',
        minHeight:    '100%',
        color:        cream,
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: `1px solid ${creamLine}` }}
      >
        <div className="flex items-center gap-2">
          <span className="live-dot" style={{ background: '#4ADE80' }} />
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: creamDim, fontFamily: 'var(--sans-lat)' }}
          >
            قياس مكتمل
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded"
            style={{
              background: result.usedAI ? 'rgba(245, 183, 28, 0.18)' : creamLine,
              color:      result.usedAI ? '#F5B71C' : creamDim,
              fontFamily: 'var(--sans-lat)',
            }}
          >
            {result.usedAI ? 'AI · ' : ''}{result.confidence}% ثقة
          </span>
        </div>
      </div>

      {/* Main display */}
      <div className="flex-1 px-5 py-6 flex flex-col justify-center">

        {/* Sentiment label */}
        <div
          className="text-[11px] uppercase tracking-[0.2em] mb-3"
          style={{ color: creamDim, fontFamily: 'var(--sans-lat)' }}
        >
          اتجاه الخبر
        </div>

        {/* Score + dir */}
        <div className="flex items-baseline gap-3 mb-1">
          <span
            className="mono-num"
            style={{
              fontSize:      '68px',
              fontWeight:    300,
              lineHeight:    0.9,
              letterSpacing: '-0.04em',
              color:         sentColor,
            }}
          >
            {dirSymbol} {displayScore}
          </span>
          <span
            className="mono-num"
            style={{ fontSize: '14px', color: creamFaint, paddingBottom: '8px' }}
            title="الدرجة من 92 — الحد الأقصى لأوزان القاموس"
          >
            / 92
          </span>
        </div>

        <div
          className="text-[14px] font-medium mb-5"
          style={{ color: sentColor }}
        >
          {sentimentLabel(dir)}
          <span className="text-[11px] mr-2" style={{ color: creamDim }}>
            · حدة {intensity}
          </span>
        </div>

        {/* Score bar */}
        <div
          className="h-[3px] rounded-full overflow-hidden mb-6"
          style={{ background: creamLine }}
        >
          <div
            style={{
              width:       `${abs}%`,
              height:      '100%',
              background:  sentColor,
              transition:  'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        {/* Keywords */}
        {(sentiment.pos_words.length > 0 || sentiment.neg_words.length > 0) && (
          <div className="mb-5">
            <div
              className="text-[10px] uppercase tracking-[0.15em] mb-2"
              style={{ color: creamDim, fontFamily: 'var(--sans-lat)' }}
            >
              كلمات مؤثرة
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sentiment.pos_words.slice(0, 4).map(w => (
                <span
                  key={w}
                  className="text-[11px] px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(74, 222, 128, 0.12)',
                    color:      '#86EFAC',
                    border:     '1px solid rgba(74, 222, 128, 0.24)',
                  }}
                >
                  {w}
                </span>
              ))}
              {sentiment.neg_words.slice(0, 4).map(w => (
                <span
                  key={w}
                  className="text-[11px] px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(248, 113, 113, 0.12)',
                    color:      '#FCA5A5',
                    border:     '1px solid rgba(248, 113, 113, 0.24)',
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metrics grid */}
        <div
          className="grid grid-cols-2 gap-y-3 gap-x-6 pt-4"
          style={{ borderTop: `1px solid ${creamLine}` }}
        >
          <Metric
            label="القطاع"
            value={pData?.label ?? '—'}
            color={cream}
          />
          <Metric
            label="قطاعات مرتبطة"
            value={`${related.length}`}
            mono
            color={cream}
          />
          <Metric
            label="سرعة الانتشار"
            value={speed}
            color={cream}
          />
          <Metric
            label="الأسهم المتأثرة"
            value={`${stocks.length}`}
            mono
            color="#F5B71C"
          />
        </div>
      </div>

      {/* AI insight footer (if exists) */}
      {result.insight && (
        <div
          className="px-5 py-4"
          style={{
            background:  'rgba(245, 183, 28, 0.06)',
            borderTop:   `1px solid ${creamLine}`,
          }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.18em] mb-1.5 flex items-center gap-1.5"
            style={{ color: '#F5B71C', fontFamily: 'var(--sans-lat)' }}
          >
            <span>✦</span> قراءة Claude
          </div>
          <p
            className="text-[12.5px] leading-relaxed"
            style={{ color: 'rgba(244, 239, 230, 0.88)' }}
          >
            {result.insight}
          </p>
        </div>
      )}
    </div>
  )
}

function Metric({
  label, value, mono, color,
}: {
  label: string
  value: string
  mono?: boolean
  color: string
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.12em] mb-1"
        style={{ color: 'rgba(244, 239, 230, 0.44)', fontFamily: 'var(--sans-lat)' }}
      >
        {label}
      </div>
      <div
        className={`text-[13px] font-medium ${mono ? 'mono-num' : ''}`}
        style={{ color }}
      >
        {value}
      </div>
    </div>
  )
}
