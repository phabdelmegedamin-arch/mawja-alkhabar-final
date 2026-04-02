'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

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
      <div className="h-8 bg-bg2 border-b border-b-1 flex items-center px-4">
        <span className="text-2xs text-tx-3 font-mono">// أسعار مباشرة</span>
        <span className="text-2xs text-tx-3 mr-4 animate-pulse">⏳ جارٍ التحميل...</span>
      </div>
    )
  }

  const items = [...prices, ...prices] // duplicate for seamless loop

  return (
    <div className="h-8 bg-bg2 border-b border-b-1 overflow-hidden flex items-center">
      <div className="shrink-0 px-3 text-2xs text-tx-3 font-mono border-l border-b-1">
        // أسعار
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap">
          {items.map((p, i) => {
            const isPos = p.change > 0
            const isNeg = p.change < 0
            return (
              <span key={i} className="ticker-item">
                <span className="text-tx-2 font-mono text-2xs">{p.ticker}</span>
                <span className="font-mono text-2xs">{p.price.toFixed(2)}</span>
                <span className={cn(
                  'font-mono text-2xs font-bold',
                  isPos ? 'text-gr' : isNeg ? 'text-rd' : 'text-tx-2'
                )}>
                  {isPos ? '▲' : isNeg ? '▼' : '◆'}
                  {Math.abs(p.change)}%
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
