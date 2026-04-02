'use client'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useAnalysis }  from '@/hooks/useAnalysis'
import { Button, Empty, Badge } from '@/components/ui'
import { sentimentColor, sentimentLabel, timeAgo } from '@/lib/utils'
import { useState } from 'react'

export default function WatchlistPage() {
  const { enriched, remove, toggle, count } = useWatchlist()
  const { run } = useAnalysis()
  const [addTicker, setAddTicker] = useState('')
  const [addName, setAddName]     = useState('')
  const { add } = useWatchlist()

  const handleAdd = () => {
    if (!addTicker.trim()) return
    add(addTicker.trim().toUpperCase(), addName.trim() || addTicker.trim())
    setAddTicker(''); setAddName('')
  }

  if (!count) return (
    <div className="space-y-4">
      <h1 className="text-lg font-black">⭐ قائمة المتابعة</h1>
      <Empty icon="⭐" title="قائمتك فارغة"
        sub="أضف أسهماً هنا — سيُنبّهك النظام عند ظهور أخبار تخصها"
        action={
          <div className="flex gap-2 justify-center">
            <input value={addTicker} onChange={e=>setAddTicker(e.target.value)}
              placeholder="كود السهم (مثال: 2222)" maxLength={4}
              className="px-3 py-2 text-sm rounded-lg bg-bg3 border border-b-2 text-tx w-44"
              onKeyDown={e=>e.key==='Enter'&&handleAdd()} />
            <Button onClick={handleAdd} size="sm">+ إضافة</Button>
          </div>
        }
      />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black">⭐ قائمة المتابعة</h1>
          <p className="text-xs text-tx-3">{count} سهم — تنبيه فوري عند الأخبار</p>
        </div>
        {/* Add row */}
        <div className="flex gap-2">
          <input value={addTicker} onChange={e=>setAddTicker(e.target.value)}
            placeholder="رمز السهم" maxLength={4}
            className="px-2.5 py-1.5 text-sm rounded-lg bg-bg3 border border-b-2 text-tx w-28"
            onKeyDown={e=>e.key==='Enter'&&handleAdd()} />
          <Button onClick={handleAdd} size="sm">+ إضافة</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {enriched.map(w => {
          const lastDir = w.lastSentiment?.dir
          const lastCol = lastDir ? sentimentColor(lastDir) : 'var(--t3)'
          return (
            <div key={w.ticker} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-ac text-base">{w.ticker}</span>
                    <span className="text-sm font-bold text-tx">{w.name}</span>
                  </div>
                  <div className="text-2xs text-tx-3 mt-0.5">
                    أُضيف {timeAgo(w.addedAt)}
                  </div>
                </div>
                <button onClick={()=>remove(w.ticker)}
                  className="text-tx-3 hover:text-rd transition-colors text-sm">✕</button>
              </div>

              {/* Stats */}
              <div className="flex gap-3 mb-3">
                <div className="text-center">
                  <div className="text-base font-black font-mono text-tx">{w.analysisCount}</div>
                  <div className="text-2xs text-tx-3">تحليل</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-black font-mono text-gr">{w.posCount}</div>
                  <div className="text-2xs text-tx-3">إيجابي</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-black font-mono text-rd">{w.negCount}</div>
                  <div className="text-2xs text-tx-3">سلبي</div>
                </div>
              </div>

              {/* Last news */}
              {w.lastHeadline ? (
                <div className="rounded-lg p-2.5 text-xs border"
                  style={{ background: lastCol + '08', borderColor: lastCol + '30' }}>
                  <span className="font-bold" style={{ color: lastCol }}>
                    {lastDir && sentimentLabel(lastDir)} ·{' '}
                  </span>
                  <span className="text-tx-2">{w.lastHeadline}</span>
                </div>
              ) : (
                <div className="text-2xs text-tx-3 text-center py-2">
                  لا توجد أخبار بعد
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
