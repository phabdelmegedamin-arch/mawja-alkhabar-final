'use client'
import Accordion from '@/components/ui/Accordion'
import { useWatchlistStore } from '@/store/watchlist'
import type { AnalysisResult, RippleNode } from '@/types'

interface Props {
  result:      AnalysisResult
  wave:        1 | 2 | 3
  defaultOpen?: boolean
}

const WAVE_META = {
  1: {
    title:       'الموجة الأولى',
    subtitle:    'تأثير مباشر',
    timeframe:   'خلال ساعات',
    badgeBg:     'var(--ac2)',
    badgeColor:  'var(--ac)',
    accentColor: 'var(--ac)',
    symbol:      '◉',
  },
  2: {
    title:       'الموجة الثانية',
    subtitle:    'ارتباط قطاعي',
    timeframe:   'خلال أيام',
    badgeBg:     'rgba(184, 92, 0, 0.12)',
    badgeColor:  'var(--or)',
    accentColor: 'var(--or)',
    symbol:      '◎',
  },
  3: {
    title:       'الموجة الثالثة',
    subtitle:    'انتشار سوقي',
    timeframe:   'خلال أسابيع',
    badgeBg:     'var(--bg4)',
    badgeColor:  'var(--t2)',
    accentColor: 'var(--t2)',
    symbol:      '○',
  },
} as const

export default function WaveAccordion({ result, wave, defaultOpen = false }: Props) {
  const meta = WAVE_META[wave]
  const { ripples, sentiment } = result

  // استخراج أسهم هذه الموجة
  const stocks = ripples.filter(r => !r.isHead && r.wave === wave)

  if (stocks.length === 0) return null

  const abs = Math.abs(sentiment.score)

  return (
    <Accordion
      defaultOpen={defaultOpen}
      accentColor={meta.accentColor}
      badge={
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-semibold"
          style={{ background: meta.badgeBg, color: meta.badgeColor }}
        >
          W{wave}
        </div>
      }
      title={meta.title}
      subtitle={`${meta.subtitle} · ${meta.timeframe}`}
      preview={
        <div className="flex items-center gap-2 text-[12px]">
          <span
            className="mono-num font-medium"
            style={{ color: meta.badgeColor }}
          >
            {stocks.length} سهم
          </span>
          <span style={{ color: 'var(--t3)' }}>·</span>
          <span className="mono-num" style={{ color: 'var(--t2)' }}>
            {stocks[0]?.pct}
          </span>
        </div>
      }
    >
      <div className="p-3">
        {/* Column headers */}
        <div
          className="hidden sm:grid grid-cols-[auto_1fr_auto_auto] gap-3 px-2.5 pb-2 text-[10px] uppercase tracking-[0.1em]"
          style={{
            color: 'var(--t3)',
            fontFamily: 'var(--sans-lat)',
            borderBottom: '1px solid var(--b1)',
          }}
        >
          <span>الرمز</span>
          <span>السهم</span>
          <span>القطاع</span>
          <span className="text-left">التأثير</span>
        </div>

        <div className="pt-1 space-y-0.5">
          {stocks.map((stock, i) => (
            <StockRow key={`${stock.t}-${i}`} stock={stock} absScore={abs} />
          ))}
        </div>
      </div>
    </Accordion>
  )
}

function StockRow({ stock, absScore }: { stock: RippleNode; absScore: number }) {
  const { has, add, remove } = useWatchlistStore()
  const inW = has(stock.t ?? '')

  const pctValue = stock.pctVal ?? parseFloat(stock.pct ?? '0')
  const isPos    = pctValue > 0
  const isNeg    = pctValue < 0
  const pctColor = isPos ? 'var(--gr)' : isNeg ? 'var(--rd)' : 'var(--t2)'

  // نسبة طول البار مقارنة بأقوى تأثير ممكن
  const barWidth = Math.min(100, (Math.abs(pctValue) / (absScore * 0.1 || 1)) * 20)

  return (
    <div
      className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] gap-2 sm:gap-3 items-center px-2.5 py-2 rounded hover:bg-[var(--bg3)] transition-colors"
    >
      {/* Ticker */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => inW ? remove(stock.t ?? '') : add(stock.t ?? '', stock.n ?? '')}
          className="text-[14px] leading-none transition-transform hover:scale-110"
          style={{ color: inW ? 'var(--ac)' : 'var(--t3)' }}
          title={inW ? 'إزالة من المتابعة' : 'إضافة للمتابعة'}
        >
          {inW ? '★' : '☆'}
        </button>
        <span
          className="mono-num text-[11px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: 'var(--ac2)', color: 'var(--ac)' }}
        >
          {stock.t}
        </span>
      </div>

      {/* Name */}
      <div className="min-w-0">
        <div
          className="text-[13px] truncate"
          style={{ color: 'var(--tx)' }}
        >
          {stock.n}
        </div>
        <div
          className="text-[10px] sm:hidden truncate"
          style={{ color: 'var(--t3)' }}
        >
          {stock.s}
        </div>
      </div>

      {/* Sector (desktop) */}
      <span
        className="hidden sm:block text-[11px] whitespace-nowrap"
        style={{ color: 'var(--t3)' }}
      >
        {stock.s}
      </span>

      {/* Impact */}
      <div className="flex items-center gap-2 justify-end">
        <div
          className="hidden md:block w-16 h-[3px] rounded-full overflow-hidden"
          style={{ background: 'var(--b1)' }}
        >
          <div
            style={{
              width:      `${barWidth}%`,
              height:     '100%',
              background: pctColor,
              transition: 'width 0.5s ease',
              marginRight:isPos ? 0 : 'auto',
              marginLeft: isNeg ? 0 : 'auto',
            }}
          />
        </div>
        <span
          className="mono-num text-[13px] font-semibold w-14 text-left"
          style={{ color: pctColor }}
        >
          {stock.pct}
        </span>
      </div>
    </div>
  )
}
