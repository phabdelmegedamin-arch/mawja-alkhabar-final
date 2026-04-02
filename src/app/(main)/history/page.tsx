'use client'
import { useState } from 'react'
import { useAnalysisStore } from '@/store/analysis'
import { useAnalysis }      from '@/hooks/useAnalysis'
import { Empty, Badge, Button } from '@/components/ui'
import { sentimentColor, sentimentLabel, timeAgo } from '@/lib/utils'
import type { HistoryEntry, SentimentDirection } from '@/types'

export default function HistoryPage() {
  const history      = useAnalysisStore(s => s.history)
  const clearHistory = useAnalysisStore(s => s.clearHistory)
  const deleteHistory= useAnalysisStore(s => s.deleteHistory)
  const { run }      = useAnalysis()
  const [filter, setFilter] = useState<'all'|'pos'|'neg'|'neu'>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const filtered = history
    .filter(e => filter === 'all' || e.sentiment.dir === filter)
    .filter(e => !search || e.headline.includes(search) || e.text.includes(search))

  if (!history.length) return (
    <div className="space-y-4">
      <h1 className="text-lg font-black">⏱ سجل التحليلات</h1>
      <Empty icon="📋" title="السجل فارغ" sub="كل تحليل تُجريه يُحفظ هنا تلقائياً" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-black">⏱ سجل التحليلات</h1>
          <p className="text-xs text-tx-3">{history.length} تحليل محفوظ</p>
        </div>
        <Button variant="danger" size="sm" onClick={()=>{ if(confirm('حذف كل السجل؟')) clearHistory() }}>
          🗑 مسح الكل
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all','pos','neg','neu'] as const).map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === f ? 'bg-ac text-bg' : 'bg-bg3 border border-b-2 text-tx-3 hover:text-tx'
            }`}>
            {f==='all'?'الكل':f==='pos'?'📈 إيجابي':f==='neg'?'📉 سلبي':'➡️ محايد'}
            {f==='all' && ` (${history.length})`}
          </button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 بحث في السجل..." dir="auto"
          className="flex-1 min-w-[160px] px-3 py-1.5 text-xs rounded-lg bg-bg3 border border-b-2 text-tx" />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="card p-8 text-center text-tx-3 text-sm">لا توجد نتائج</div>
        )}
        {filtered.map(e => {
          const dir   = e.sentiment.dir as SentimentDirection
          const col   = sentimentColor(dir)
          const isExp = expanded === e.id
          return (
            <div key={e.id} className="card overflow-hidden" style={{ borderRight: `3px solid ${col}` }}>
              <button className="w-full text-right p-4 hover:bg-bg3 transition-colors"
                onClick={()=>setExpanded(isExp ? null : e.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-tx truncate">{e.headline}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant={dir}>{sentimentLabel(dir)}</Badge>
                      <span className="text-2xs text-tx-3 font-mono">
                        {Math.abs(e.sentiment.score)}%
                      </span>
                      <span className="text-2xs text-tx-3">{timeAgo(e.ts)}</span>
                      {e.usedAI && <Badge variant="ac" className="text-2xs">AI</Badge>}
                    </div>
                    {/* Stocks */}
                    {e.stocks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {e.stocks.slice(0,4).map(s => (
                          <span key={s.ticker} className="px-2 py-0.5 bg-bg3 rounded text-2xs font-mono text-ac">
                            {s.ticker} <span style={{color:col}}>{s.impact}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black font-mono" style={{color:col}}>
                      {Math.abs(e.sentiment.score)}
                    </div>
                    <div className="text-ac text-sm">{isExp ? '▲' : '▼'}</div>
                  </div>
                </div>
              </button>

              {/* Expanded */}
              {isExp && (
                <div className="border-t border-b-1 p-4 space-y-3">
                  <p className="text-xs text-tx-2 leading-relaxed">{e.text}</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={()=>{ run(e.text); window.location.href='/' }}>
                      ↩ إعادة التحليل
                    </Button>
                    <Button size="sm" variant="danger" onClick={()=>deleteHistory(e.id)}>
                      🗑 حذف
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
