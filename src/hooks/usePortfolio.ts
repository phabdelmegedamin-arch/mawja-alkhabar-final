'use client'
import { useCallback, useEffect, useState } from 'react'
import { usePortfolioStore } from '@/store/watchlist'
import type { Holding, HoldingWithLive } from '@/types'

export function usePortfolio() {
  const store = usePortfolioStore()
  const [holdings, setHoldings] = useState<HoldingWithLive[]>([])
  const [isFetching, setIsFetching] = useState(false)

  const enrichWithPrices = useCallback(async () => {
    if (!store.holdings.length) { setHoldings([]); return }
    setIsFetching(true)
    try {
      const tickers = store.holdings.map(h => h.ticker).join(',')
      const res     = await fetch(`/api/prices?tickers=${tickers}`)
      const data    = await res.json()
      const priceMap: Record<string, { price: number; change: number; spark: number[] }> = {}
      if (data.success) {
        data.data.forEach((p: any) => { priceMap[p.ticker] = p })
      }
      const enriched: HoldingWithLive[] = store.holdings.map(h => {
        const live  = priceMap[h.ticker]
        const price = live?.price ?? h.avgPrice
        const val   = price * h.qty
        const pnl   = val - h.avgPrice * h.qty
        return {
          ...h,
          livePrice: live?.price,
          change:    live?.change ?? 0,
          spark:     live?.spark ?? [],
          val,
          pnl,
          pnlPct: h.avgPrice ? pnl / (h.avgPrice * h.qty) * 100 : 0,
          dayPnl: val * ((live?.change ?? 0) / 100),
        }
      })
      setHoldings(enriched)
    } finally {
      setIsFetching(false)
    }
  }, [store.holdings])

  useEffect(() => { enrichWithPrices() }, [store.holdings.length])

  const stats = holdings.reduce(
    (acc, h) => ({
      totalVal:  acc.totalVal  + h.val,
      totalCost: acc.totalCost + h.avgPrice * h.qty,
      dayPnl:    acc.dayPnl   + h.dayPnl,
    }),
    { totalVal: 0, totalCost: 0, dayPnl: 0 }
  )
  const totalPnl    = stats.totalVal - stats.totalCost
  const totalPnlPct = stats.totalCost ? totalPnl / stats.totalCost * 100 : 0

  return {
    holdings,
    isFetching,
    refresh:  enrichWithPrices,
    add:      store.add,
    remove:   store.remove,
    clear:    store.clear,
    stats:    { ...stats, totalPnl, totalPnlPct },
  }
}
