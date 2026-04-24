'use client'
import { useEffect, useState } from 'react'

interface Ticker { t: string; n: string; p: number; ch: number }

const TRACKED = [
  { t: '2222', n: 'أرامكو' },
  { t: '1303', n: 'الكترا' },
  { t: '1120', n: 'الراجحي' },
  { t: '1180', n: 'الأهلي' },
  { t: '2010', n: 'سابك' },
  { t: '2223', n: 'لوبريف' },
  { t: '2380', n: 'بترو رابغ' },
  { t: '7010', n: 'stc' },
  { t: '2280', n: 'المراعي' },
  { t: '1150', n: 'الإنماء' },
  { t: '1211', n: 'معادن' },
]

export default function TickerBar() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPrices = async () => {
    try {
      const tickersList = TRACKED.map(t => t.t).join(',')
      const res = await fetch(`/api/prices?tickers=${tickersList}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          const merged = TRACKED.map(tr => {
            const live = data.data.find((p: any) => p.ticker === tr.t)
            return {
              t:  tr.t,
              n:  tr.n,
              p:  live?.price  ?? 0,
              ch: live?.change ?? 0,
            }
          })
          setTickers(merged)
          setLoading(false)
          return
        }
      }
    } catch {}
    // Fallback mock
    setTickers(
      TRACKED.map(t => ({
        ...t,
        p:  +(20 + Math.random() * 100).toFixed(2),
        ch: +(Math.random() * 4 - 2).toFixed(2),
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div
        className="max-w-[1320px] mx-auto flex items-center"
        style={{
          padding: '14px 48px',
          borderTop: '1px solid var(--rule)',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div className="shimmer h-3 w-48 rounded" />
      </div>
    )
  }

  return (
    <div
      className="max-w-[1320px] mx-auto flex items-center overflow-hidden"
      style={{
        padding: '14px 48px',
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      {/* ═══ Strip label: TADAWUL · OPEN مع نقطة خضراء ═══ */}
      <div
        className="flex items-center"
        style={{
          gap: '8px',
          fontFamily: 'var(--sans-lat)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--ink)',
          letterSpacing: '0.15em',
          paddingLeft: '20px',
          marginLeft: '20px',
          borderLeft: '1px solid var(--rule)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            background: 'var(--bull)',
            borderRadius: '50%',
            display: 'inline-block',
          }}
        />
        <span>TADAWUL · OPEN</span>
      </div>

      {/* ═══ Items ═══ */}
      <div
        className="flex overflow-hidden"
        style={{
          gap: '36px',
          fontFamily: 'var(--mono)',
          fontSize: '12px',
          maskImage: 'linear-gradient(90deg, transparent, black 3%, black 97%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, black 3%, black 97%, transparent)',
        }}
      >
        {tickers.map(tk => {
          const isPos = tk.ch >= 0
          return (
            <div
              key={tk.t}
              className="flex"
              style={{ gap: '8px', whiteSpace: 'nowrap' }}
            >
              <span style={{ color: 'var(--muted)' }}>{tk.t}</span>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {tk.p.toFixed(2)}
              </span>
              <span style={{ color: isPos ? 'var(--bull)' : 'var(--bear)' }}>
                {isPos ? '+' : '−'}{Math.abs(tk.ch).toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
