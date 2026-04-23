'use client'
import { cn, sentimentColor } from '@/lib/utils'
import type { AnalysisResult } from '@/types'
import { useWatchlistStore } from '@/store/watchlist'
import { DB } from '@/data/market-db'

interface Props { result: AnalysisResult }

export default function SignalBar({ result }: Props) {
  const { sentiment, primary, stocks } = result
  const { has, add, remove } = useWatchlistStore()
  const dir  = sentiment.dir
  const abs  = Math.abs(sentiment.score)
  const col  = sentimentColor(dir)
  const db = DB as {[key: string]: { label: string; icon: string }}
  const primaryLabel = db[primary]?.label ?? primary

  const verdicts = {
    pos: abs >= 75 ? 'إشارة صعود قوية جداً 🚀' : abs >= 50 ? 'إشارة صعود واضحة 📈' : 'ميل إيجابي ↗',
    neg: abs >= 75 ? 'إشارة هبوط حادة ⚠️' : abs >= 50 ? 'إشارة هبوط واضحة 📉' : 'ميل سلبي ↘',
    neu: 'تأثير محايد — راقب السوق ➡️',
  }

  const subTexts = {
    pos: `الخبر يدعم ارتفاع أسهم ${primaryLabel} — تأثير متوقع +${abs}%`,
    neg: `الخبر يضغط على أسهم ${primaryLabel} — تأثير متوقع -${abs}%`,
    neu: `لا إشارة واضحة — الخبر لا يؤثر مباشرة على ${primaryLabel}`,
  }

  const topStocks = stocks.slice(0, 5)

  return (
    <div className="card mb-4 overflow-hidden" style={{ borderRight: '3px solid ' + col }}>
      {/* Head */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: col + '15', color: col }}>
          {dir === 'pos' ? '📈' : dir === 'neg' ? '📉' : '➡️'}
        </div>
        <div className="flex-1">
          <div className="text-base font-black" style={{ color: col }}>
            {verdicts[dir]}
          </div>
          <div className="text-xs text-tx-3 mt-0.5">{subTexts[dir]}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black font-mono" style={{ color: col }}>{abs}</div>
          <div className="text-2xs text-tx-3">تأثير %</div>
        </div>
      </div>
      {/* Strength bar */}
      <div className="h-1.5 bg-bg3">
        <div className="h-full transition-all duration-700" style={{ width: `${Math.max(8, abs)}%`, background: col }} />
      </div>
      {/* Stock chips */}
      {topStocks.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3">
          {topStocks.map(s => {
            const pv  = parseFloat(s.pct ?? '0')
            const inW = has(s.t ?? '')
            // إصلاح #8: ألوان رمادية عند الخبر المحايد — لا تُظهر أخضر مضلل
            const pColor = dir === 'neu'
              ? 'var(--t2)'
              : pv > 0 ? 'var(--gr)' : pv < 0 ? 'var(--rd)' : 'var(--t2)'
            return (
              <div key={s.t} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg3 border border-b-2 text-xs">
                <span className="font-mono font-bold text-ac">{s.t}</span>
                <span className="text-tx-2">{s.n}</span>
                <span className="font-mono font-bold" style={{ color: pColor }}>{s.pct}</span>
                <button onClick={() => inW ? remove(s.t ?? '') : add(s.t ?? '', s.n ?? '')} className="ml-0.5 transition-all hover:scale-110" title={inW ? 'إزالة من المتابعة' : 'إضافة للمتابعة'}>
                  {inW ? '⭐' : '☆'}
                </button>
              </div>
            )
          })}
          {stocks.length > 5 && (
            <span className="px-2.5 py-1.5 text-xs text-tx-3">+{stocks.length - 5} سهم آخر</span>
          )}
        </div>
      )}
    </div>
  )
}
