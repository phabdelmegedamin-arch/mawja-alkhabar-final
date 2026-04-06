📁 المسار: src/components/news/NewsList.tsx
الخطأ المصلح:

sessionStorage.setItem('mw_news_text', item.text) — كان يحفظ الخبر في sessionStorage لكن لا أحد يقرأه في الصفحة الرئيسية، فالخبر يضيع → استبدل بـ CustomEvent مباشر وهو نفس الآلية التي يستمع لها NewsInput

tsx'use client'
import { useEffect, useState } from 'react'
import { cn, timeAgo } from '@/lib/utils'
import { analyzeSentiment, detectSectors } from '@/lib/nlp'
import { DB } from '@/data/market-db'
import type { NewsItem } from '@/types'

export default function NewsList() {
  const [items, setItems]     = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all'|'pos'|'neg'|'neu'>('all')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res  = await fetch('/api/news')
        const data = await res.json()
        if (data.success) {
          const analyzed = data.data.map((item: NewsItem) => ({
            ...item,
            sentiment:  analyzeSentiment(item.text),
            sectorData: detectSectors(item.text),
          }))
          setItems(analyzed)
        }
      } catch {}
      setLoading(false)
    }
    load()
    const t = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const db = DB as Record<string, { label: string; icon: string }>
  const filtered = items
    .filter(i => filter === 'all' || i.sentiment?.dir === filter)
    .filter(i => !search || i.title.includes(search) || i.text.includes(search))

  const stats = {
    pos: items.filter(i => i.sentiment?.dir === 'pos').length,
    neg: items.filter(i => i.sentiment?.dir === 'neg').length,
    neu: items.filter(i => i.sentiment?.dir === 'neu').length,
  }

  // ✅ الدالة الصحيحة لنقل الخبر للصفحة الرئيسية
  const handleNewsClick = (text: string) => {
    window.dispatchEvent(
      new CustomEvent('mw:select-news', { detail: { text } })
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.location.href = '/'
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-tx-3 flex-wrap">
        <span>{items.length} خبر</span>
        <span className="text-gr">↑{stats.pos} إيجابي</span>
        <span className="text-rd">↓{stats.neg} سلبي</span>
        <span className="text-yl">◎{stats.neu} محايد</span>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 بحث في الأخبار..."
          className="flex-1 min-w-[180px] px-3 py-2 text-sm rounded-lg bg-bg3 border border-b-2 text-tx placeholder:text-tx-3 outline-none focus:border-ac"
        />
        {(['all','pos','neg','neu'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-2 rounded-lg text-xs font-bold transition-colors',
              filter === f
                ? (f==='pos' ? 'bg-gr text-bg' : f==='neg' ? 'bg-rd text-bg' : f==='neu' ? 'bg-yl text-bg' : 'bg-ac text-bg')
                : 'bg-bg3 text-tx-3 hover:text-tx-2'
            )}>
            {f==='all' ? 'الكل' : f==='pos' ? 'إيجابي' : f==='neg' ? 'سلبي' : 'محايد'}
          </button>
        ))}
      </div>

      {/* Loading skeletons */}
      {loading && Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card p-4 space-y-2">
          <div className="shimmer h-4 w-3/4 rounded" />
          <div className="shimmer h-3 w-full rounded" />
          <div className="shimmer h-3 w-1/2 rounded" />
        </div>
      ))}

      {/* Items */}
      {!loading && filtered.map((item, i) => {
        const s    = item.sentiment
        const sec  = item.sectorData
        const dir  = s?.dir ?? 'neu'
        const abs  = Math.abs(s?.score ?? 0)
        const col  = dir==='pos' ? 'var(--gr)' : dir==='neg' ? 'var(--rd)' : 'var(--yl)'
        const secD = sec?.primary ? db[sec.primary] : null

        return (
          <div
            key={i}
            className={cn(
              'card p-4 cursor-pointer hover:border-b-3 transition-all duration-200',
              dir==='pos' ? 'hover:border-gr/40' : dir==='neg' ? 'hover:border-rd/40' : 'hover:border-yl/40'
            )}
            style={{ borderRight: `3px solid ${col}20` }}
            // ✅ إصلاح: CustomEvent بدل sessionStorage الذي لم يكن يعمل
            onClick={() => handleNewsClick(item.text)}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ background: col+'15', color: col }}
              >
                {dir==='pos' ? '📈' : dir==='neg' ? '📉' : '➡️'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-2xs text-tx-3 bg-bg3 border border-b-2 px-1.5 py-0.5 rounded">
                    {item.sourceIcon} {item.source}
                  </span>
                  {secD && <span className="text-2xs text-tx-3">{secD.icon} {secD.label}</span>}
                  <span className="text-2xs text-tx-3 mr-auto">
                    {timeAgo(item.pubDate || item.fetchedAt)}
                  </span>
                  <span className="font-mono text-xs font-bold" style={{ color: col }}>
                    {(s?.score ?? 0) >= 0 ? '+' : ''}{s?.score ?? 0}
                  </span>
                </div>
                <div className="text-sm font-semibold text-tx leading-snug mb-1">{item.title}</div>
                {item.desc && (
                  <div className="text-xs text-tx-3 leading-relaxed line-clamp-2">{item.desc}</div>
                )}
                <div className="mt-2 h-1 bg-bg3 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(abs, 100)}%`, background: col }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {!loading && filtered.length === 0 && (
        <div className="card p-12 text-center text-tx-3">لا توجد أخبار مطابقة</div>
      )}
    </div>
  )
}
