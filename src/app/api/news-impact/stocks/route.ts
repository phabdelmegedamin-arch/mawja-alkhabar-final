// ══════════════════════════════════════════════════════════════════
// المسار: src/app/api/news-impact/stocks/route.ts
// الحالة: ملف جديد
// ══════════════════════════════════════════════════════════════════
 
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { DB, SECTOR_ORDER } from '@/data/market-db'
import { STOCK_INFO } from '@/data/network-db'
 
interface StockRow {
  code:             string
  name_ar:          string
  sector:           string
  market:           'TASI' | 'NOMU'
  network_score:    number
  is_owner:         boolean
  is_owned:         boolean
  liquidity_factor: number
  active:           boolean
}
 
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q      = searchParams.get('q')?.toLowerCase()
  const market = searchParams.get('market')
  const leader = searchParams.get('leader') === 'true'
 
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('stocks_network')
      .select('code, name_ar, sector, market, network_score, is_owner, is_owned, liquidity_factor, active')
      .eq('active', true)
      .order('network_score', { ascending: false })
 
    if (market) query = query.eq('market', market)
    if (leader) query = query.gte('network_score', 7)
 
    const { data, error } = await query
 
    if (!error && data && data.length > 0) {
      let result = data as StockRow[]
      if (q) result = result.filter((s: StockRow) =>
        s.code.toLowerCase().includes(q) || s.name_ar.includes(q)
      )
      return NextResponse.json({ success:true, source:'supabase', count:result.length, data:result })
    }
 
    throw new Error('Supabase empty — using fallback')
 
  } catch {
    const networkScores: Record<string, number> = {
      '2222':10,'2010':9,'2280':8,'1120':8,'7010':8,'1180':7,'1211':7,
      '2290':7,'2380':7,'2050':7,'2082':6,'6002':5,'2020':6,'2223':6,
    }
 
    const allStocks: StockRow[] = SECTOR_ORDER.flatMap(sec =>
      (DB[sec]?.stocks ?? []).map(s => ({
        code:             s.t,
        name_ar:          s.n,
        sector:           DB[sec]?.label ?? sec,
        market:           (s.s === 'تاسي' ? 'TASI' : 'NOMU') as 'TASI' | 'NOMU',
        network_score:    networkScores[s.t] ?? 3,
        is_owner:         false,
        is_owned:         false,
        liquidity_factor: STOCK_INFO[s.t]?.liquidity ?? 1.0,
        active:           true,
      }))
    )
 
    let result = allStocks
    if (q)      result = result.filter((s: StockRow) => s.code.toLowerCase().includes(q) || s.name_ar.includes(q))
    if (market) result = result.filter((s: StockRow) => s.market === market)
    if (leader) result = result.filter((s: StockRow) => s.network_score >= 7)
 
    return NextResponse.json({
      success: true,
      source:  'static',
      count:   result.length,
      data:    result.sort((a: StockRow, b: StockRow) => b.network_score - a.network_score),
    })
  }
}
