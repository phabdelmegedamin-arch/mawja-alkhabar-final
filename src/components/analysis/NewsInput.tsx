'use client'
import { useState, useRef, useEffect } from 'react'
import { useAnalysisStore } from '@/store/analysis'
import { useAuthStore } from '@/store/auth'
import { DB, FREE_TICKERS } from '@/data/market-db'
import { analyzeSentiment, detectSectors, buildRipples, buildTimeline, detectPrimaryStockFromText } from '@/lib/nlp'
import type { AnalysisResult } from '@/types'

type Tab = 'news' | 'stock'

const SA_STOCKS = (() => {
  const out: Array<{ t: string; n: string; sector: string; icon: string; sectorKey: string }> = []
  for (const [key, sec] of Object.entries(DB)) {
    for (const s of sec.stocks) {
      out.push({ t: s.t, n: s.n, sector: sec.label, icon: sec.icon, sectorKey: key })
    }
  }
  return out.sort((a, b) => a.t.localeCompare(b.t))
})()

const EXAMPLES = [
  { label: 'أرباح قياسية',   text: 'أعلنت أرامكو السعودية عن أرباح قياسية في الربع الأخير فاقت توقعات المحللين بنسبة 12%' },
  { label: 'رفع الفائدة',    text: 'رفع البنك المركزي سعر الفائدة 25 نقطة أساس في ظل ضغوط التضخم' },
  { label: 'عقد ضخم',        text: 'ترسية مشروع حكومي بقيمة 3 مليار ريال ضمن مستهدفات رؤية 2030' },
  { label: 'تراجع النفط',    text: 'انخفض خام برنت 4% متأثراً بمخاوف تباطؤ الطلب العالمي' },
]

export default function NewsInput() {
  const [tab, setTab] = useState<Tab>('news')
  const {
    inputText, setInput, setResult, setLoading, setError, addHistory,
    market, waves, isLoading,
  } = useAnalysisStore()
  const { session, isPro } = useAuthStore()
  const pro = isPro()

  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<typeof SA_STOCKS[0] | null>(null)
  const [showDrop, setShowDrop] = useState(false)
  const [useAI, setUseAI]       = useState(pro)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = search
    ? SA_STOCKS.filter(s =>
        s.t.includes(search) || s.n.includes(search) || s.sector.includes(search),
      ).slice(0, 10)
    : SA_STOCKS.slice(0, 10)

  const runAnalysis = async (text: string) => {
    if (text.trim().length < 15) {
      setError('النص قصير جداً — 15 حرفاً على الأقل'); return
    }
    setLoading(true); setError(null)
    try {
      const detectedCode = detectPrimaryStockFromText(text)
      if (detectedCode && !pro && !(FREE_TICKERS as readonly string[]).includes(detectedCode)) {
        setError('هذا السهم يتطلب الاشتراك المدفوع — النسخة المجانية تدعم أرامكو (2222) فقط')
        setLoading(false); return
      }

      const sentiment    = analyzeSentiment(text)
      const { primary, allSectors } = detectSectors(text)
      const ripples      = buildRipples(primary, allSectors, sentiment, waves, detectedCode, text)
      const timeline     = buildTimeline(sentiment)

      let insight: string | undefined
      let usedAI = false
      let networkResult: any = undefined
      let originCode: string | undefined = detectedCode ?? undefined

      if (useAI && pro) {
        try {
          const apiKey = localStorage.getItem('anthropic_key') || undefined
          const res    = await fetch('/api/analyze', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}) },
            body:    JSON.stringify({ text, market, waves, useAI: true }),
          })
          const data = await res.json()
          if (data.success && data.data) {
            insight       = data.data.insight
            usedAI        = data.data.usedAI
            networkResult = data.data.networkResult
            originCode    = data.data.originCode ?? originCode
          }
        } catch {}
      } else {
        try {
          const res  = await fetch('/api/analyze', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ text, market, waves, useAI: false }),
          })
          const data = await res.json()
          if (data.success && data.data) {
            networkResult = data.data.networkResult
            originCode    = data.data.originCode ?? originCode
          }
        } catch {}
      }

      const result: AnalysisResult = {
        text, sentiment, primary, allSectors, ripples,
        stocks:     ripples.filter(r => !r.isHead),
        timeline, insight,
        confidence: usedAI ? 82 : 71,
        usedAI, market, ts: new Date().toISOString(),
        networkResult, originCode,
      }

      setResult(result)
      addHistory({
        id:           Date.now(),
        ts:           result.ts,
        text:         result.text,
        headline:     result.text.slice(0, 60) + (result.text.length > 60 ? '…' : ''),
        primary:      result.primary,
        primaryLabel: DB[result.primary]?.label ?? result.primary,
        sentiment:    { score: result.sentiment.score, dir: result.sentiment.dir },
        stocks:       result.stocks.slice(0, 5).map(s => ({ ticker: s.t ?? '', name: s.n ?? '', impact: s.pct ?? '' })),
        keywords:     [...result.sentiment.pos_words, ...result.sentiment.neg_words],
        confidence:   result.confidence,
        usedAI:       result.usedAI,
      })
    } catch (err) {
      setError('حدث خطأ أثناء التحليل — حاول مرة أخرى')
      console.error(err)
    }
    setLoading(false)
  }

  const handleNewsSubmit = () => runAnalysis(inputText)

  const handleStockSubmit = () => {
    if (!selected) { setError('اختر سهماً أولاً'); return }
    const text = `تحليل أداء سهم ${selected.n} (${selected.t}) في قطاع ${selected.sector}.`
    setInput(text)
    runAnalysis(text)
  }

  return (
    <div className="card overflow-hidden">
      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--b1)' }}>
        {([
          { id: 'news',  label: 'تحليل خبر' },
          { id: 'stock', label: 'بحث سهم' },
        ] as { id: Tab; label: string }[]).map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-3 px-4 text-[13px] transition-colors relative"
              style={{
                color:      active ? 'var(--tx)' : 'var(--t2)',
                background: active ? 'transparent' : 'var(--bg3)',
                fontWeight: active ? 500 : 400,
              }}
            >
              {t.label}
              {active && (
                <div
                  className="absolute bottom-[-1px] left-0 right-0 h-[2px]"
                  style={{ background: 'var(--ac)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="p-5">

        {/* ─── Tab 1: News ─── */}
        {tab === 'news' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="section-label">نص الخبر</span>
                <span className="text-[11px] mono-num" style={{ color: 'var(--t3)' }}>
                  {inputText.length} / 2000
                </span>
              </div>
              <textarea
                value={inputText}
                onChange={e => setInput(e.target.value)}
                placeholder="الصق نص الخبر هنا، أو عنوان مقال، أو تصريح رسمي..."
                maxLength={2000}
                rows={5}
                className="w-full p-3 text-[14px] leading-relaxed"
                style={{
                  background:   '#fff',
                  border:       '1px solid var(--b2)',
                  borderRadius: 'var(--r-lg)',
                  resize:       'vertical',
                  fontFamily:   'var(--sans)',
                  color:        'var(--tx)',
                }}
              />
            </div>

            {/* Examples */}
            <div>
              <div className="section-label mb-2">أمثلة جاهزة</div>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex.label}
                    onClick={() => setInput(ex.text)}
                    className="px-2.5 py-1 text-[11px] rounded transition-colors"
                    style={{
                      background: 'var(--bg3)',
                      color:      'var(--t2)',
                      border:     '1px solid var(--b1)',
                    }}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI toggle */}
            {pro && (
              <label
                className="flex items-center gap-2 p-2.5 rounded cursor-pointer"
                style={{
                  background: useAI ? 'var(--ac2)' : 'var(--bg3)',
                  border:     `1px solid ${useAI ? 'var(--ac)' : 'var(--b1)'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={e => setUseAI(e.target.checked)}
                  className="w-3.5 h-3.5"
                  style={{ accentColor: 'var(--ac)' }}
                />
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--tx)' }}>
                    تعزيز بـ Claude AI
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--t3)' }}>
                    تحليل مفصّل + رؤى ذكية
                  </div>
                </div>
                <span className="tag tag-ac">PRO</span>
              </label>
            )}

            <button
              onClick={handleNewsSubmit}
              disabled={isLoading || inputText.trim().length < 15}
              className="w-full py-3 rounded font-medium text-[14px] transition-all"
              style={{
                background: isLoading || inputText.trim().length < 15
                  ? 'var(--bg4)'
                  : 'var(--tx)',
                color: isLoading || inputText.trim().length < 15
                  ? 'var(--t3)'
                  : 'var(--bg)',
                cursor: isLoading || inputText.trim().length < 15 ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'جارٍ القياس…' : 'قياس اتجاه الخبر ←'}
            </button>
          </div>
        )}

        {/* ─── Tab 2: Stock ─── */}
        {tab === 'stock' && (
          <div className="space-y-4">
            <div ref={dropRef}>
              <span className="section-label block mb-2">السهم</span>
              <div className="relative">
                <input
                  type="text"
                  value={selected ? `${selected.t} — ${selected.n}` : search}
                  onChange={e => { setSearch(e.target.value); setSelected(null); setShowDrop(true) }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="ابحث بالرمز أو الاسم (مثال: 2222، أرامكو، البنوك)"
                  className="w-full p-3 text-[14px]"
                  style={{
                    background:   '#fff',
                    border:       '1px solid var(--b2)',
                    borderRadius: 'var(--r-lg)',
                    color:        'var(--tx)',
                  }}
                />
                {showDrop && filtered.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 max-h-[320px] overflow-y-auto z-20"
                    style={{
                      background:   '#fff',
                      border:       '1px solid var(--b2)',
                      borderRadius: 'var(--r-lg)',
                      boxShadow:    '0 4px 16px rgba(15,15,15,0.08)',
                    }}
                  >
                    {filtered.map(s => {
                      const isFree = (FREE_TICKERS as readonly string[]).includes(s.t)
                      const locked = !pro && !isFree
                      return (
                        <button
                          key={s.t}
                          onClick={() => {
                            if (locked) { setError('هذا السهم يتطلب PRO'); return }
                            setSelected(s); setSearch(''); setShowDrop(false); setError(null)
                          }}
                          disabled={locked}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-right transition-colors hover:bg-[var(--bg3)]"
                          style={{
                            borderBottom: '1px solid var(--b1)',
                            opacity:      locked ? 0.45 : 1,
                            cursor:       locked ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <span
                            className="mono-num text-[12px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: 'var(--ac2)',
                              color:      'var(--ac)',
                              minWidth:   48,
                              textAlign:  'center',
                            }}
                          >
                            {s.t}
                          </span>
                          <span className="flex-1 text-[13px]" style={{ color: 'var(--tx)' }}>
                            {s.n}
                          </span>
                          <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
                            {s.sector}
                          </span>
                          {locked && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--ac2)', color: 'var(--ac)' }}>
                              PRO
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {selected && (
              <div
                className="p-3 rounded"
                style={{ background: 'var(--bg3)', border: '1px solid var(--b1)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="mono-num text-[13px] font-medium px-2 py-0.5 rounded"
                      style={{ background: 'var(--ac2)', color: 'var(--ac)' }}
                    >
                      {selected.t}
                    </span>
                    <span className="text-[14px] font-medium" style={{ color: 'var(--tx)' }}>
                      {selected.n}
                    </span>
                  </div>
                  <button
                    onClick={() => { setSelected(null); setSearch('') }}
                    className="text-[18px] leading-none"
                    style={{ color: 'var(--t3)' }}
                  >
                    ×
                  </button>
                </div>
                <div className="text-[11px]" style={{ color: 'var(--t2)' }}>
                  قطاع {selected.sector}
                </div>
              </div>
            )}

            <button
              onClick={handleStockSubmit}
              disabled={!selected || isLoading}
              className="w-full py-3 rounded font-medium text-[14px] transition-all"
              style={{
                background: !selected || isLoading ? 'var(--bg4)' : 'var(--tx)',
                color:      !selected || isLoading ? 'var(--t3)'  : 'var(--bg)',
                cursor:     !selected || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'جارٍ القياس…' : 'قياس وضع السهم ←'}
            </button>
          </div>
        )}

        {/* Free tier notice */}
        {!pro && session && (
          <div
            className="mt-4 p-2.5 rounded text-[11px] text-center"
            style={{ background: 'var(--ac2)', color: 'var(--ac)' }}
          >
            النسخة المجانية: تحليل أرامكو (2222) فقط · ترقية PRO لفك كل الأسهم
          </div>
        )}
      </div>
    </div>
  )
}
