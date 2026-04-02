'use client'
import { useEffect, useState } from 'react'
import { usePortfolioStore } from '@/store/watchlist'
import { cn, formatSAR, formatPct } from '@/lib/utils'
import type { HoldingWithLive } from '@/types'

export default function HoldingsTable() {
  const { holdings, remove } = usePortfolioStore()
  const [live, setLive]      = useState<Record<string, { price: number; change: number }>>({})
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ ticker:'', name:'', qty:'', price:'' })

  useEffect(() => {
    if (!holdings.length) return
    const fetchPrices = async () => {
      setLoading(true)
      try {
        const tickers = holdings.map(h => h.ticker).join(',')
        const res     = await fetch(`/api/prices?tickers=${tickers}`)
        const data    = await res.json()
        if (data.success) {
          const map: Record<string, { price: number; change: number }> = {}
          data.data.forEach((p: any) => { map[p.ticker] = { price: p.price, change: p.change } })
          setLive(map)
        }
      } catch {}
      setLoading(false)
    }
    fetchPrices()
    const t = setInterval(fetchPrices, 90_000)
    return () => clearInterval(t)
  }, [holdings.length])

  // Calculate stats
  const enriched: HoldingWithLive[] = holdings.map(h => {
    const lv  = live[h.ticker]
    const price = lv?.price ?? h.avgPrice
    const val   = price * h.qty
    const pnl   = val - h.avgPrice * h.qty
    const pnlPct = h.avgPrice > 0 ? pnl / (h.avgPrice * h.qty) * 100 : 0
    return { ...h, livePrice: lv?.price, change: lv?.change, val, pnl, pnlPct, dayPnl: val * (lv?.change ?? 0) / 100 }
  })

  const totalVal  = enriched.reduce((s, h) => s + h.val, 0)
  const totalPnl  = enriched.reduce((s, h) => s + h.pnl, 0)
  const totalPnlPct = totalVal > 0 ? enriched.reduce((s,h) => s + h.val*h.avgPrice, 0) > 0 ? totalPnl/enriched.reduce((s,h)=>s+h.avgPrice*h.qty,0)*100 : 0 : 0

  const addHolding = () => {
    const { add } = usePortfolioStore.getState()
    const t = form.ticker.trim().toUpperCase()
    const q = parseFloat(form.qty)
    const p = parseFloat(form.price)
    if (!t || !q || !p) return
    add({ ticker: t, name: form.name || t, qty: q, avgPrice: p, sector: 'other' })
    setForm({ ticker:'', name:'', qty:'', price:'' })
    setShowAdd(false)
  }

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'قيمة المحفظة',       value: formatSAR(totalVal),    color: 'var(--ac)' },
          { label:'إجمالي الربح/الخسارة', value: formatSAR(totalPnl),  color: totalPnl>=0?'var(--gr)':'var(--rd)' },
          { label:'العائد',              value: formatPct(totalPnlPct), color: totalPnlPct>=0?'var(--gr)':'var(--rd)' },
          { label:'عدد الأسهم',          value: holdings.length,        color: 'var(--yl)' },
        ].map(kpi => (
          <div key={kpi.label} className="card p-3 text-center">
            <div className="text-xl font-black font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-2xs text-tx-3 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-b-1">
          <h3 className="text-sm font-bold">الأسهم</h3>
          <button onClick={() => setShowAdd(v => !v)}
            className="px-3 py-1.5 rounded-lg bg-ac text-bg text-xs font-bold hover:bg-ac/90 transition-colors">
            ＋ إضافة
          </button>
        </div>

        {showAdd && (
          <div className="p-4 border-b border-b-1 bg-bg3 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['ticker','الرمز','2222'],['name','الاسم','أرامكو'],['qty','الكمية','100'],['price','سعر الشراء','32.5']].map(([k,l,ph]) => (
              <div key={k}>
                <label className="text-2xs text-tx-3 block mb-1">{l}</label>
                <input value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                  placeholder={ph} type={k==='qty'||k==='price'?'number':'text'}
                  className="w-full px-2 py-1.5 text-sm rounded-lg bg-bg border border-b-2 text-tx outline-none focus:border-ac" />
              </div>
            ))}
            <div className="col-span-2 md:col-span-4 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-tx-3 hover:text-tx transition-colors">إلغاء</button>
              <button onClick={addHolding} className="px-4 py-1.5 bg-gr text-bg text-xs font-bold rounded-lg hover:bg-gr/90 transition-colors">إضافة</button>
            </div>
          </div>
        )}

        {!holdings.length ? (
          <div className="p-12 text-center text-tx-3 text-sm">
            <div className="text-3xl mb-2">💼</div>
            لا توجد أسهم — أضف أول سهم
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="adm-table">
              <thead>
                <tr>
                  {['السهم','الكمية','السعر الحالي','القيمة','الربح/الخسارة','إجراء'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enriched.map(h => {
                  const pCol = h.pnl >= 0 ? 'var(--gr)' : 'var(--rd)'
                  const cCol = (h.change ?? 0) >= 0 ? 'var(--gr)' : 'var(--rd)'
                  return (
                    <tr key={h.ticker}>
                      <td>
                        <div className="font-mono text-ac font-bold">{h.ticker}</div>
                        <div className="text-2xs text-tx-3">{h.name}</div>
                      </td>
                      <td className="font-mono">{h.qty.toLocaleString()}</td>
                      <td>
                        <div className="font-mono">{(h.livePrice ?? h.avgPrice).toFixed(2)}</div>
                        {h.change != null && (
                          <div className="text-2xs font-mono font-bold" style={{ color: cCol }}>
                            {h.change >= 0 ? '▲' : '▼'}{Math.abs(h.change)}%
                          </div>
                        )}
                      </td>
                      <td className="font-mono">{formatSAR(h.val)}</td>
                      <td>
                        <div className="font-mono font-bold" style={{ color: pCol }}>
                          {h.pnl >= 0 ? '+' : ''}{formatSAR(h.pnl)}
                        </div>
                        <div className="text-2xs font-mono" style={{ color: pCol }}>
                          {formatPct(h.pnlPct)}
                        </div>
                      </td>
                      <td>
                        <button onClick={() => remove(h.ticker)}
                          className="text-rd hover:text-rd/70 text-xs transition-colors">حذف</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
