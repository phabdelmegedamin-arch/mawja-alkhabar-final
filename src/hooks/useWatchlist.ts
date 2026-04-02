'use client'
import { useWatchlistStore } from '@/store/watchlist'
import { useAnalysisStore }  from '@/store/analysis'

export function useWatchlist() {
  const store   = useWatchlistStore()
  const history = useAnalysisStore(s => s.history)

  // للأسهم المتابَعة: إيجاد آخر خبر وإحصاء التحليلات
  const enriched = store.items.map(w => {
    const relatedHistory = history.filter(e =>
      e.stocks.some(s => s.ticker === w.ticker)
    )
    const lastEntry  = relatedHistory[0]
    const posCount   = relatedHistory.filter(e => e.sentiment.dir === 'pos').length
    const negCount   = relatedHistory.filter(e => e.sentiment.dir === 'neg').length
    return {
      ...w,
      analysisCount: relatedHistory.length,
      posCount,
      negCount,
      lastHeadline: lastEntry?.headline,
      lastSentiment: lastEntry?.sentiment,
    }
  })

  return {
    items:      store.items,
    enriched,
    add:        store.add,
    remove:     store.remove,
    has:        store.has,
    toggle:     (ticker: string, name: string) =>
                  store.has(ticker) ? store.remove(ticker) : store.add(ticker, name),
    count:      store.items.length,
  }
}
