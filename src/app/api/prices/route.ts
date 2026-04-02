import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tickers = (searchParams.get('tickers') ?? '2222,1180,7010,2010,1120')
    .split(',').slice(0, 16)

  const results = await Promise.allSettled(
    tickers.map(t => fetchPrice(t.trim()))
  )

  const prices = results
    .map((r, i) => r.status === 'fulfilled' && r.value ? r.value : { ticker: tickers[i], price: 0, change: 0, ts: Date.now() })
    .filter(p => p.price > 0)

  return NextResponse.json({ success: true, data: prices })
}

async function fetchPrice(ticker: string) {
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SR?interval=1d&range=5d`
    )}`
    const res   = await fetch(proxy, { signal: AbortSignal.timeout(7000) })
    if (!res.ok) throw new Error()
    const raw   = await res.json()
    const chart = JSON.parse(raw.contents)?.chart?.result?.[0]
    if (!chart) throw new Error()
    const meta  = chart.meta
    const close = (chart.indicators?.quote?.[0]?.close ?? []).filter(Boolean)
    const price = meta.regularMarketPrice || close[close.length - 1] || 0
    const prev  = meta.previousClose || close[close.length - 2] || price
    const change = prev ? +((price - prev) / prev * 100).toFixed(2) : 0
    return {
      ticker, price: +price.toFixed(2), change,
      spark: close.slice(-5).map((v: number) => +v.toFixed(2)),
      ts:    Date.now(),
    }
  } catch { return null }
}
