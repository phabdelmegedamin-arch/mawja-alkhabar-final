'use client'
import { useEffect, useState } from 'react'

interface Ticker { t: string; n: string; p: number; ch: number }

const TRACKED = [
  { t: '2222', n: 'أرامكو' },
  { t: '1120', n: 'الراجحي' },
  { t: '2010', n: 'سابك' },
  { t: '7010', n: 'stc' },
  { t: '1180', n: 'الأهلي' },
  { t: '2280', n: 'المراعي' },
  { t: '1150', n: 'الإنماء' },
  { t: '1211', n: 'معادن' },
  { t: '4190', n: 'جرير' },
  { t: '2050', n: 'صافولا' },
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
        className="h-8 flex items-center px-4"
        style={{
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--b1)',
        }}
      >
        <div className="shimmer h-3 w-48 rounded" />
      </div>
    )
  }

  const doubled = [...tickers, ...tickers]

  return (
    <div
      className="h-8 overflow-hidden relative"
      style={{
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--b1)',
      }}
    >
      {/* Live indicator */}
      <div
        className="absolute right-0 top-0 bottom-0 z-10 flex items-center gap-1.5 px-3"
        style={{
          background: 'linear-gradient(270deg, var(--bg2) 70%, transparent)',
          paddingLeft: 24,
        }}
      >
        <span className="live-dot" />
        <span
          className="text-[10px] font-medium uppercase tracking-[0.1em]"
          style={{ color: 'var(--t2)', fontFamily: 'var(--sans-lat)' }}
        >
          LIVE · TASI
        </span>
      </div>

      {/* Scrolling tickers */}
      <div className="flex items-center h-full animate-ticker will-change-transform">
        {doubled.map((tk, i) => {
          const isPos = tk.ch >= 0
          const color = isPos ? 'var(--gr)' : 'var(--rd)'
          return (
            <div
              key={`${tk.t}-${i}`}
              className="ticker-item"
              style={{ borderLeft: '1px solid var(--b1)' }}
            >
              <span
                className="mono-num text-[10px] font-medium"
                style={{ color: 'var(--t3)' }}
              >
                {tk.t}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--tx)' }}>
                {tk.n}
              </span>
              <span className="mono-num text-[11px]" style={{ color: 'var(--t2)' }}>
                {tk.p.toFixed(2)}
              </span>
              <span
                className="mono-num text-[10px] font-medium"
                style={{ color }}
              >
                {isPos ? '▲' : '▼'} {Math.abs(tk.ch).toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
