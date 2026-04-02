'use client'
import { useEffect, useState } from 'react'
import { cn, sentimentLabel, sentimentColor } from '@/lib/utils'
import type { AnalysisResult } from '@/types'
import { DB } from '@/data/market-db'

interface Props { result: AnalysisResult }

export default function SentimentCard({ result }: Props) {
  const { sentiment, primary, allSectors, stocks } = result
  const abs     = Math.abs(sentiment.score)
  const dir     = sentiment.dir
  const color   = sentimentColor(dir)
  const [displayScore, setDisplayScore] = useState(0)

  // Animated counter
  useEffect(() => {
    setDisplayScore(0)
    const step  = Math.ceil(abs / 18)
    const timer = setInterval(() => {
      setDisplayScore(prev => {
        const next = prev + step
        if (next >= abs) { clearInterval(timer); return abs }
        return next
      })
    }, 30)
    return () => clearInterval(timer)
  }, [abs])

  const pData   = (DB as Record<string, { label: string; icon: string }>)[primary]
  const related = allSectors.slice(1, 4)
    .map(k => (DB as Record<string, { label: string }>)[k]?.label)
    .filter(Boolean)

  const intensity = abs > 60 ? 'عالية ●●●●○' : abs > 35 ? 'متوسطة ●●●○○' : 'منخفضة ●●○○○'

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-bold text-tx-2">تصنيف الخبر</h3>
        <span className={cn(
          'tag text-xs',
          dir === 'pos' ? 'tag-pos' : dir === 'neg' ? 'tag-neg' : 'tag-neu'
        )}>
          {sentimentLabel(dir)}
        </span>
      </div>

      {/* Big Score */}
      <div className="flex items-end gap-3 mb-4">
        <div
          className="text-5xl font-black font-mono leading-none"
          style={{ color }}
        >
          {dir === 'pos' ? '+' : dir === 'neg' ? '-' : ''}{displayScore}
        </div>
        <div className="pb-1 text-tx-3 text-xs">/ 92</div>
      </div>

      {/* Score bar */}
      <div className="score-bar mb-4">
        <div
          className="score-bar-fill animate-bar-fill"
          style={{
            width:      `${abs}%`,
            background: dir === 'pos'
              ? 'linear-gradient(90deg,#00D47A,#00C8F0)'
              : dir === 'neg'
              ? 'linear-gradient(90deg,#FF3355,#FF7040)'
              : 'linear-gradient(90deg,#F0C93A,#FF7040)',
          }}
        />
      </div>

      {/* Keywords */}
      {(sentiment.pos_words.length > 0 || sentiment.neg_words.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {sentiment.pos_words.map(w => (
            <span key={w} className="tag tag-pos text-2xs">{w}</span>
          ))}
          {sentiment.neg_words.map(w => (
            <span key={w} className="tag tag-neg text-2xs">{w}</span>
          ))}
        </div>
      )}

      <div className="border-t border-b-1 pt-3 space-y-2">
        {/* Primary sector */}
        <div className="flex justify-between text-xs">
          <span className="text-tx-3">القطاع الرئيسي</span>
          <span className="text-tx font-medium">{pData?.label}</span>
        </div>
        {/* Related sectors */}
        <div className="flex justify-between text-xs">
          <span className="text-tx-3">قطاعات مرتبطة</span>
          <span className="text-tx">{related.length} قطاع</span>
        </div>
        {/* Impact */}
        <div className="flex justify-between text-xs">
          <span className="text-tx-3">حدة التأثير</span>
          <span style={{ color }} className="font-medium">{intensity}</span>
        </div>
        {/* Speed */}
        <div className="flex justify-between text-xs">
          <span className="text-tx-3">سرعة الانتشار</span>
          <span className="text-tx">{abs > 55 ? 'سريعة' : 'متوسطة'}</span>
        </div>
        {/* Stocks count */}
        <div className="flex justify-between text-xs">
          <span className="text-tx-3">الأسهم المتأثرة</span>
          <span className="text-ac font-mono font-bold">{stocks.length} سهم</span>
        </div>
      </div>
    </div>
  )
}
