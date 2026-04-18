'use client'
import { useEffect, useState } from 'react'
import { cn, sentimentLabel, sentimentColor } from '@/lib/utils'
import type { AnalysisResult } from '@/types'
import { DB } from '@/data/market-db'

interface Props { result: AnalysisResult }

export default function SentimentCard({ result }: Props) {
  const { sentiment, primary, allSectors, stocks } = result
  const abs   = Math.abs(sentiment.score)
  const dir   = sentiment.dir
  const color = sentimentColor(dir)
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    setDisplayScore(0)
    const step  = Math.ceil(abs / 20)
    const timer = setInterval(() => {
      setDisplayScore(prev => {
        const next = prev + step
        if (next >= abs) { clearInterval(timer); return abs }
        return next
      })
    }, 28)
    return () => clearInterval(timer)
  }, [abs])

  const pData   = (DB as Record<string, { label: string; icon: string }>)[primary]
  const related = allSectors.slice(1, 4)
    .map(k => (DB as Record<string, { label: string }>)[k]?.label)
    .filter(Boolean)

  const intensity = abs > 60 ? 'عالية' : abs > 35 ? 'متوسطة' : 'منخفضة'
  const intensityDots = abs > 60 ? '●●●●○' : abs > 35 ? '●●●○○' : '●●○○○'

  const fillColor = dir === 'pos'
    ? 'var(--gr)'
    : dir === 'neg'
    ? 'var(--rd)'
    : 'var(--yl)'

  return (
    <div className="card p-4">
      <div
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--t2)' }}>
          تصنيف الخبر
        </span>
        <span className={cn(
          'tag',
          dir === 'pos' ? 'tag-pos' : dir === 'neg' ? 'tag-neg' : 'tag-neu'
        )}>
          {sentimentLabel(dir)}
        </span>
      </div>

      {/* Score */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '48px',
            fontWeight: 300,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color,
          }}
        >
          {dir === 'pos' ? '+' : dir === 'neg' ? '−' : ''}{displayScore}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--t3)', paddingBottom: '4px' }}>
          / 92
        </span>
      </div>

      {/* Bar */}
      <div className="score-bar" style={{ marginBottom: '16px' }}>
        <div
          className="score-bar-fill"
          style={{ width: `${abs}%`, background: fillColor, opacity: 0.85 }}
        />
      </div>

      {/* Keywords */}
      {(sentiment.pos_words.length > 0 || sentiment.neg_words.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '16px' }}>
          {sentiment.pos_words.map(w => (
            <span key={w} className="tag tag-pos" style={{ fontSize: '11px' }}>{w}</span>
          ))}
          {sentiment.neg_words.map(w => (
            <span key={w} className="tag tag-neg" style={{ fontSize: '11px' }}>{w}</span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ borderTop: '1px solid var(--b1)', paddingTop: '12px' }}>
        {[
          { label: 'القطاع الرئيسي',  value: pData?.label,      color: undefined },
          { label: 'قطاعات مرتبطة',   value: `${related.length} قطاع`, color: undefined },
          { label: 'حدة التأثير',     value: `${intensity} ${intensityDots}`, color },
          { label: 'سرعة الانتشار',   value: abs > 55 ? 'سريعة' : 'متوسطة', color: undefined },
          { label: 'الأسهم المتأثرة', value: `${stocks.length} سهم`, color: 'var(--ac)' },
        ].map(row => (
          <div
            key={row.label}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 0',
              borderBottom: '1px solid var(--b1)',
              fontSize: '12px',
            }}
          >
            <span style={{ color: 'var(--t3)' }}>{row.label}</span>
            <span
              style={{
                fontWeight: 500,
                fontFamily: row.label === 'الأسهم المتأثرة' ? 'var(--mono)' : undefined,
                color: row.color ?? 'var(--tx)',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
