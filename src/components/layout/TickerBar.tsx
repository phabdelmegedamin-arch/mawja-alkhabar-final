'use client'
import { useEffect, useState } from 'react'

interface Price { ticker: string; price: number; change: number }

const DEFAULT_TICKERS = ['2222','1180','7010','2010','1120','1303','3030','8020']

export default function TickerBar() {
  const [prices, setPrices] = useState<Price[]>([])

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res  = await fetch(`/api/prices?tickers=${DEFAULT_TICKERS.join(',')}`)
        const data = await res.json()
        if (data.success) setPrices(data.data)
      } catch {}
    }
    fetchPrices()
    const t = setInterval(fetchPrices, 60_000)
    return () => clearInterval(t)
  }, [])

  if (!prices.length) {
    return (
      <div
        style={{
          height: '32px',
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--b1)',
          display: 'flex', alignItems: 'center',
          paddingRight: '16px', gap: '10px',
        }}
      >
        <span style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>
          LIVE
        </span>
        <span style={{ fontSize: '11px', color: 'var(--t3)' }}>جارٍ التحميل...</span>
      </div>
    )
  }

  const items = [...prices, ...prices]

  return (
    <div
      style={{
        height: '32px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--b1)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Label */}
      <div
        style={{
          flexShrink: 0,
          padding: '0 12px',
          borderLeft: '1px solid var(--b1)',
          fontSize: '10px',
          fontFamily: 'var(--mono)',
          fontWeight: 500,
          letterSpacing: '0.06em',
          color: 'var(--t3)',
        }}
      >
        LIVE
      </div>

      {/* Scroll */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div className="animate-ticker" style={{ display: 'flex', width: 'max-content' }}>
          {items.map((p, i) => {
            const isPos = p.change > 0
            const isNeg = p.change < 0
            return (
              <span key={i} className="ticker-item">
                <span style={{ color: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: '11px' }}>
                  {p.ticker}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 500, color: 'var(--tx)' }}>
                  {p.price.toFixed(2)}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: isPos ? 'var(--gr)' : isNeg ? 'var(--rd)' : 'var(--t2)',
                  }}
                >
                  {isPos ? '▲' : isNeg ? '▼' : '◆'}{Math.abs(p.change)}%
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
