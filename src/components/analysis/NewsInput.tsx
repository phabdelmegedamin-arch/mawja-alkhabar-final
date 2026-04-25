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

/* ═══════════════════════════════════════════
   Arabic text normalization for matching
   ═══════════════════════════════════════════ */
function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove diacritics (tashkeel)
    .replace(/[إأآا]/g, 'ا')               // normalize alef variants
    .replace(/ى/g, 'ي')                    // normalize ya
    .replace(/ؤ/g, 'و')                    // normalize waw-hamza
    .replace(/ئ/g, 'ي')                    // normalize ya-hamza
    .replace(/ة/g, 'ه')                    // ta marbuta -> ha
    .replace(/\s+/g, ' ')                  // collapse whitespace
    .toLowerCase()
    .trim()
}

/* ═══════════════════════════════════════════
   Stock news item shape
   ═══════════════════════════════════════════ */
interface StockNewsItem {
  id: string
  title: string
  desc: string
  link: string
  source: string
  pubDate: string
  fetchedAt: number
  matchType: 'direct' | 'sector' // direct = ticker/name match, sector = keyword match
}

/* ═══════════════════════════════════════════
   News fetching + filtering for a given stock
   ═══════════════════════════════════════════ */
interface FetchNewsResult {
  matches: StockNewsItem[]
  totalFetched: number
  diagnostics?: Array<{ source: string; count: number; via: string; status: string }>
}

async function fetchNewsForStock(stock: {
  t: string
  n: string
  sector: string
  sectorKey: string
}, opts: { debug?: boolean; bypassCache?: boolean } = {}): Promise<FetchNewsResult> {
  const url = opts.debug ? '/api/news?debug=1' : '/api/news'
  const res = await fetch(url, opts.bypassCache ? { cache: 'no-store' } : {})
  if (!res.ok) throw new Error('فشل جلب الأخبار')
  const data = await res.json()
  if (!data?.success || !Array.isArray(data.data)) {
    return { matches: [], totalFetched: 0, diagnostics: data?.diagnostics }
  }

  const sectorInfo = (DB as any)[stock.sectorKey]
  const sectorKeywords: string[] = sectorInfo?.kw ?? []

  const normName = normalizeArabic(stock.n)
  // Build alternative name fragments (e.g., "أرامكو السعودية" → also try "أرامكو")
  const nameFragments = stock.n
    .split(/\s+/)
    .map(w => normalizeArabic(w))
    .filter(w => w.length >= 4 && !['السعودية', 'العربية', 'الشركة', 'مجموعة', 'شركة', 'القابضة'].includes(w))

  const matches: StockNewsItem[] = []

  for (const item of data.data as any[]) {
    const rawText = `${item.title ?? ''} ${item.desc ?? ''}`
    const normText = normalizeArabic(rawText)

    let matchType: 'direct' | 'sector' | null = null

    // 1) Direct ticker match (numeric, with non-digit boundaries)
    if (new RegExp(`(?:^|[^0-9])${stock.t}(?:[^0-9]|$)`).test(rawText)) {
      matchType = 'direct'
    }
    // 2) Full normalized name match
    else if (normName.length >= 3 && normText.includes(normName)) {
      matchType = 'direct'
    }
    // 3) Distinctive name fragment match
    else if (nameFragments.some(frag => normText.includes(frag))) {
      matchType = 'direct'
    }
    // 4) Sector keyword match (weaker signal)
    else if (sectorKeywords.some(kw => normText.includes(normalizeArabic(kw)))) {
      matchType = 'sector'
    }

    if (matchType) {
      matches.push({
        id: item.id ?? Math.random().toString(36).slice(2),
        title: item.title ?? '',
        desc: item.desc ?? '',
        link: item.link ?? '',
        source: item.source ?? '',
        pubDate: item.pubDate ?? '',
        fetchedAt: item.fetchedAt ?? Date.now(),
        matchType,
      })
    }
  }

  // Sort: direct matches first, then by recency
  matches.sort((a, b) => {
    if (a.matchType !== b.matchType) return a.matchType === 'direct' ? -1 : 1
    return b.fetchedAt - a.fetchedAt
  })

  return {
    matches: matches.slice(0, 20),
    totalFetched: data.data.length,
    diagnostics: data.diagnostics,
  }
}

function timeAgoAr(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000)
  if (diffMin < 1) return 'الآن'
  if (diffMin < 60) return `${diffMin} د`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `${h} س`
  const d = Math.floor(h / 24)
  return `${d} ي`
}

export default function NewsInput() {
  const [tab, setTab] = useState<Tab>('news')
  const {
    inputText, setInput, setResult, setLoading, setError, addHistory,
    market, waves, isLoading,
  } = useAnalysisStore()
  const { isPro } = useAuthStore()
  const pro = isPro()

  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<typeof SA_STOCKS[0] | null>(null)
  const [showDrop, setShowDrop] = useState(false)
  const [useAI, setUseAI]       = useState(pro)
  const dropRef = useRef<HTMLDivElement>(null)

  /* ── Stock-news state ────────────────────── */
  const [stockNews,    setStockNews]    = useState<StockNewsItem[]>([])
  const [newsLoading,  setNewsLoading]  = useState(false)
  const [newsError,    setNewsError]    = useState<string | null>(null)
  const [hasFetched,   setHasFetched]   = useState(false)
  const [totalFetched, setTotalFetched] = useState(0)
  const [refreshTick,  setRefreshTick]  = useState(0)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  /* ── Auto-fetch news whenever a stock is selected (or refresh) ─── */
  useEffect(() => {
    if (!selected) {
      setStockNews([])
      setNewsError(null)
      setHasFetched(false)
      setTotalFetched(0)
      return
    }
    let cancelled = false
    setNewsLoading(true)
    setNewsError(null)
    setStockNews([])
    setHasFetched(false)

    fetchNewsForStock(selected, { bypassCache: refreshTick > 0 })
      .then(({ matches, totalFetched }) => {
        if (cancelled) return
        setStockNews(matches)
        setTotalFetched(totalFetched)
        setHasFetched(true)
      })
      .catch(err => {
        if (cancelled) return
        console.error(err)
        setNewsError('تعذّر جلب الأخبار — تحقق من الاتصال وحاول مجدداً')
        setHasFetched(true)
      })
      .finally(() => {
        if (!cancelled) setNewsLoading(false)
      })

    return () => { cancelled = true }
  }, [selected, refreshTick])

  const refreshNews = () => setRefreshTick(t => t + 1)

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

      try {
        const apiKey = useAI && pro ? (localStorage.getItem('anthropic_key') || undefined) : undefined
        const res    = await fetch('/api/analyze', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}) },
          body:    JSON.stringify({ text, market, waves, useAI: useAI && pro }),
        })
        const data = await res.json()
        if (data.success && data.data) {
          insight       = data.data.insight
          usedAI        = data.data.usedAI
          networkResult = data.data.networkResult
          originCode    = data.data.originCode ?? originCode
        }
      } catch {}

      const result: AnalysisResult = {
        text, sentiment, primary, allSectors, ripples,
        stocks:     ripples.filter(r => !r.isHead),
        timeline, insight,
        confidence: usedAI ? 92 : 71,
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

  /* عند الضغط على خبر متعلق بالسهم → نُشغّل التحليل عليه */
  const handleNewsClick = (item: StockNewsItem) => {
    const fullText = `${item.title}. ${item.desc}`.trim()
    setInput(fullText)
    runAnalysis(fullText)
    // اسحب الانتباه نحو نتيجة التحليل
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /* تحليل عام للسهم بدون خبر معيّن (احتياطي) */
  const handleGenericStockAnalysis = () => {
    if (!selected) { setError('اختر سهماً أولاً'); return }
    const text = `تحليل أداء سهم ${selected.n} (${selected.t}) في قطاع ${selected.sector}.`
    setInput(text)
    runAnalysis(text)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (tab === 'news') handleNewsSubmit()
      else handleGenericStockAnalysis()
    }
  }

  return (
    <div onKeyDown={handleKey}>
      {/* ═══ التبويبات ═══ */}
      <div className="flex" style={{ borderBottom: '1px solid var(--ink)' }}>
        <button
          onClick={() => setTab('news')}
          className="flex items-center transition-colors relative"
          style={{
            padding: '20px 36px',
            fontFamily: 'var(--sans)',
            fontSize: '15px',
            fontWeight: 500,
            color: tab === 'news' ? 'var(--ink)' : 'var(--muted)',
            background: tab === 'news' ? 'var(--cream)' : 'transparent',
            border: 'none',
            borderLeft: '1px solid var(--ink)',
            cursor: 'pointer',
            gap: '12px',
          }}
        >
          {tab === 'news' && (
            <span
              className="absolute right-0"
              style={{ top: '-1px', width: '100%', height: '3px', background: 'var(--ink)' }}
            />
          )}
          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 500, color: tab === 'news' ? 'var(--amber-deep)' : 'var(--muted)' }}>
            01
          </span>
          <span>إدخال الخبر</span>
        </button>

        <button
          onClick={() => setTab('stock')}
          className="flex items-center transition-colors relative"
          style={{
            padding: '20px 36px',
            fontFamily: 'var(--sans)',
            fontSize: '15px',
            fontWeight: 500,
            color: tab === 'stock' ? 'var(--ink)' : 'var(--muted)',
            background: tab === 'stock' ? 'var(--cream)' : 'transparent',
            border: 'none',
            borderLeft: '1px solid var(--ink)',
            cursor: 'pointer',
            gap: '12px',
          }}
        >
          {tab === 'stock' && (
            <span
              className="absolute right-0"
              style={{ top: '-1px', width: '100%', height: '3px', background: 'var(--ink)' }}
            />
          )}
          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 500, color: tab === 'stock' ? 'var(--amber-deep)' : 'var(--muted)' }}>
            02
          </span>
          <span>بحث بالسهم</span>
        </button>

        <div
          className="flex items-center"
          style={{
            marginRight: 'auto',
            padding: '0 36px',
            gap: '16px',
            fontFamily: 'var(--sans-lat)',
            fontSize: '11px',
            color: 'var(--muted)',
            letterSpacing: '0.1em',
          }}
        >
          <span>NEWS SENTIMENT ENGINE · V2.4</span>
        </div>
      </div>

      {/* ═══ محتوى الإدخال ═══ */}
      <div style={{ padding: '40px 44px' }}>

        {tab === 'news' && (
          <>
            {/* ═══ منطقة النص ═══ */}
            <textarea
              value={inputText}
              onChange={e => setInput(e.target.value)}
              placeholder="الصق نص الخبر هنا، أو عنوان مقال، أو تصريح رسمي..."
              maxLength={2000}
              dir="rtl"
              style={{
                width: '100%',
                minHeight: '160px',
                padding: 0,
                paddingBottom: '24px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--rule)',
                color: 'var(--ink)',
                fontFamily: 'var(--sans)',
                fontSize: '24px',
                fontWeight: 300,
                lineHeight: 1.55,
                resize: 'none',
                letterSpacing: '-0.015em',
                outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderBottomColor = 'var(--ink)')}
              onBlur={(e) => (e.currentTarget.style.borderBottomColor = 'var(--rule)')}
            />

            {/* ═══ صف Meta: badges + char count ═══ */}
            <div className="flex items-center justify-between" style={{ marginTop: '16px' }}>
              <div className="flex" style={{ gap: '10px' }}>
                <span style={{
                  fontFamily: 'var(--sans-lat)',
                  fontSize: '10px',
                  fontWeight: 500,
                  color: 'var(--muted)',
                  letterSpacing: '0.1em',
                  padding: '4px 8px',
                  background: 'var(--cream-deep)',
                }}>
                  AR · عربي
                </span>
                <span style={{
                  fontFamily: 'var(--sans-lat)',
                  fontSize: '10px',
                  fontWeight: 500,
                  color: 'var(--muted)',
                  letterSpacing: '0.1em',
                  padding: '4px 8px',
                  background: 'var(--cream-deep)',
                }}>
                  نص حر
                </span>
              </div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                color: 'var(--muted)',
              }}>
                <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{inputText.length}</strong> / 2,000 حرف
              </div>
            </div>

            {/* ═══ صف الإعدادات: MARKET / DEPTH / SOURCE ═══ */}
            <div
              className="flex"
              style={{
                marginTop: '28px',
                paddingTop: '24px',
                borderTop: '1px solid var(--rule)',
              }}
            >
              <SettingItem labelEn="MARKET" value="السوق السعودي" first />
              <SettingItem labelEn="DEPTH" value="3 موجات" />
              <SettingItem labelEn="SOURCE" value="نص حر" last />
            </div>

            {/* ═══ صف الـ RUN ═══ */}
            <div className="flex items-center justify-between" style={{ marginTop: '32px' }}>
              <span style={{
                fontSize: '12px',
                color: 'var(--muted)',
                fontFamily: 'var(--sans-lat)',
              }}>
                اضغط <Kbd>⌘</Kbd> <Kbd>↵</Kbd> للقياس السريع
              </span>

              <button
                onClick={handleNewsSubmit}
                disabled={isLoading || inputText.trim().length < 15}
                className="inline-flex items-center transition-colors"
                style={{
                  gap: '16px',
                  padding: '16px 32px',
                  background: 'var(--ink)',
                  border: 'none',
                  color: 'var(--cream)',
                  fontFamily: 'var(--sans)',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: isLoading || inputText.trim().length < 15 ? 'not-allowed' : 'pointer',
                  opacity: isLoading || inputText.trim().length < 15 ? 0.6 : 1,
                }}
              >
                <span>{isLoading ? 'جارٍ القياس…' : 'قياس اتجاه الخبر'}</span>
                <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                  <path d="M1 5 H 16 M 11 1 L 16 5 L 11 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* ═══ Tab 2: بحث بالسهم ═══ */}
        {tab === 'stock' && (
          <div className="space-y-5">
            <div ref={dropRef}>
              <div
                style={{
                  fontFamily: 'var(--sans-lat)',
                  fontSize: '10px',
                  fontWeight: 500,
                  color: 'var(--muted)',
                  letterSpacing: '0.15em',
                  marginBottom: '12px',
                }}
              >
                STOCK · السهم
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={selected ? `${selected.t} — ${selected.n}` : search}
                  onChange={e => { setSearch(e.target.value); setSelected(null); setShowDrop(true) }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="ابحث بالرمز أو الاسم (مثال: 2222، أرامكو، البنوك)"
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    fontSize: '18px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--rule)',
                    color: 'var(--ink)',
                    outline: 'none',
                  }}
                />
                {showDrop && filtered.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 z-20 overflow-y-auto"
                    style={{
                      marginTop: '4px',
                      maxHeight: '320px',
                      background: '#fff',
                      border: '1px solid var(--rule)',
                      boxShadow: '0 4px 16px rgba(15,15,15,0.08)',
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
                          className="w-full flex items-center gap-3 transition-colors hover:bg-[var(--cream-deep)]"
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            borderBottom: '1px solid var(--rule)',
                            opacity: locked ? 0.45 : 1,
                            cursor: locked ? 'not-allowed' : 'pointer',
                            background: 'transparent',
                            border: 'none',
                            borderTop: 'none',
                          }}
                        >
                          <span style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'var(--muted)',
                            background: 'var(--cream)',
                            padding: '3px 7px',
                            border: '1px solid var(--rule)',
                            minWidth: 50,
                            textAlign: 'center',
                          }}>
                            {s.t}
                          </span>
                          <span className="flex-1" style={{ fontSize: '14px', color: 'var(--ink)' }}>
                            {s.n}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {s.sector}
                          </span>
                          {locked && (
                            <span style={{
                              fontFamily: 'var(--sans-lat)',
                              fontSize: '9px',
                              fontWeight: 600,
                              padding: '3px 6px',
                              background: 'var(--amber)',
                              color: 'var(--ink)',
                              letterSpacing: '0.15em',
                            }}>
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

            {/* ═══════════════════════════════════════════════
                 قائمة الأخبار المتعلقة بالسهم المختار
                ═══════════════════════════════════════════════ */}
            {selected && (
              <div style={{ marginTop: '32px' }}>
                <div
                  className="flex items-center justify-between"
                  style={{
                    paddingBottom: '12px',
                    borderBottom: '1px solid var(--rule)',
                    marginBottom: '4px',
                  }}
                >
                  <div className="flex items-center" style={{ gap: '10px' }}>
                    <span style={{
                      fontFamily: 'var(--sans-lat)',
                      fontSize: '10px',
                      fontWeight: 500,
                      color: 'var(--muted)',
                      letterSpacing: '0.15em',
                    }}>
                      RELATED NEWS · أخبار {selected.n}
                    </span>
                    {!newsLoading && hasFetched && (
                      <span style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        color: 'var(--muted)',
                        background: 'var(--cream-deep)',
                        padding: '2px 8px',
                      }}>
                        {stockNews.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center" style={{ gap: '14px' }}>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--muted)',
                      fontFamily: 'var(--sans-lat)',
                    }}>
                      اضغط على خبر لبدء التحليل
                    </span>
                    <button
                      onClick={refreshNews}
                      disabled={newsLoading}
                      title="تحديث الأخبار"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        background: 'transparent',
                        border: '1px solid var(--rule)',
                        color: 'var(--ink)',
                        fontFamily: 'var(--sans-lat)',
                        fontSize: '11px',
                        cursor: newsLoading ? 'wait' : 'pointer',
                        opacity: newsLoading ? 0.5 : 1,
                        letterSpacing: '0.1em',
                      }}
                    >
                      <svg
                        width="11" height="11" viewBox="0 0 24 24" fill="none"
                        style={{
                          animation: newsLoading ? 'spin 1s linear infinite' : 'none',
                        }}
                      >
                        <path
                          d="M3 12a9 9 0 0 1 15.2-6.5L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.2 6.5L3 16M3 21v-5h5"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        />
                      </svg>
                      <span>تحديث</span>
                    </button>
                  </div>
                </div>

                {/* ─── Loading skeleton ─── */}
                {newsLoading && (
                  <div style={{ paddingTop: '8px' }}>
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="animate-pulse"
                        style={{
                          padding: '16px 0',
                          borderBottom: '1px solid var(--rule)',
                          opacity: 0.6,
                        }}
                      >
                        <div style={{
                          height: '14px',
                          width: '70%',
                          background: 'var(--cream-deep)',
                          marginBottom: '8px',
                        }} />
                        <div style={{
                          height: '12px',
                          width: '90%',
                          background: 'var(--cream-deep)',
                        }} />
                      </div>
                    ))}
                    <div style={{
                      textAlign: 'center',
                      padding: '12px 0',
                      fontSize: '12px',
                      color: 'var(--muted)',
                      fontFamily: 'var(--sans-lat)',
                    }}>
                      جارٍ جلب الأخبار من المصادر…
                    </div>
                  </div>
                )}

                {/* ─── Error state ─── */}
                {!newsLoading && newsError && (
                  <div style={{
                    padding: '20px',
                    border: '1px solid var(--rule)',
                    background: 'var(--cream-deep)',
                    color: 'var(--bear)',
                    fontSize: '13px',
                    textAlign: 'center',
                  }}>
                    {newsError}
                  </div>
                )}

                {/* ─── News list ─── */}
                {!newsLoading && !newsError && stockNews.length > 0 && (
                  <div style={{
                    maxHeight: '420px',
                    overflowY: 'auto',
                    marginTop: '8px',
                  }}>
                    {stockNews.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleNewsClick(item)}
                        disabled={isLoading}
                        className="w-full transition-colors hover:bg-[var(--cream-deep)]"
                        style={{
                          display: 'block',
                          padding: '16px 0',
                          textAlign: 'right',
                          background: 'transparent',
                          borderTop: 'none',
                          borderLeft: 'none',
                          borderRight: 'none',
                          borderBottom: '1px solid var(--rule)',
                          cursor: isLoading ? 'wait' : 'pointer',
                          opacity: isLoading ? 0.5 : 1,
                          width: '100%',
                        }}
                      >
                        <div className="flex items-start" style={{ gap: '12px' }}>
                          <span style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '10px',
                            fontWeight: 500,
                            color: item.matchType === 'direct' ? 'var(--amber-deep)' : 'var(--muted)',
                            background: item.matchType === 'direct' ? 'var(--amber)' : 'var(--cream-deep)',
                            padding: '3px 7px',
                            letterSpacing: '0.1em',
                            flexShrink: 0,
                            marginTop: '3px',
                          }}>
                            {item.matchType === 'direct' ? 'مباشر' : 'القطاع'}
                          </span>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: 'var(--sans)',
                              fontSize: '15px',
                              fontWeight: 500,
                              color: 'var(--ink)',
                              lineHeight: 1.5,
                              marginBottom: '6px',
                            }}>
                              {item.title}
                            </div>

                            {item.desc && (
                              <div style={{
                                fontSize: '13px',
                                color: 'var(--muted)',
                                lineHeight: 1.5,
                                marginBottom: '8px',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}>
                                {item.desc}
                              </div>
                            )}

                            <div className="flex items-center" style={{
                              gap: '12px',
                              fontFamily: 'var(--sans-lat)',
                              fontSize: '11px',
                              color: 'var(--muted)',
                            }}>
                              <span>{item.source}</span>
                              <span style={{ fontFamily: 'var(--mono)' }}>·</span>
                              <span style={{ fontFamily: 'var(--mono)' }}>{timeAgoAr(item.fetchedAt)}</span>
                            </div>
                          </div>

                          <svg width="14" height="10" viewBox="0 0 18 10" fill="none" style={{ flexShrink: 0, marginTop: '6px' }}>
                            <path d="M1 5 H 16 M 11 1 L 16 5 L 11 9" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="square" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* ─── Empty state ─── */}
                {!newsLoading && !newsError && hasFetched && stockNews.length === 0 && (
                  <div style={{
                    padding: '32px 24px',
                    border: '1px solid var(--rule)',
                    background: 'var(--cream-deep)',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--ink)',
                      marginBottom: '6px',
                      fontWeight: 500,
                    }}>
                      {totalFetched === 0
                        ? 'تعذّر جلب الأخبار من المصادر حالياً'
                        : `لا توجد أخبار حديثة لـ ${selected.n}`}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--muted)',
                      lineHeight: 1.6,
                    }}>
                      {totalFetched === 0 ? (
                        <>
                          مصادر الأخبار (أرقام، مباشر، الاقتصادية…) لم تستجب الآن.
                          {' '}
                          <button
                            onClick={refreshNews}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--amber-deep)',
                              cursor: 'pointer',
                              padding: 0,
                              textDecoration: 'underline',
                              font: 'inherit',
                            }}
                          >
                            إعادة المحاولة
                          </button>
                        </>
                      ) : (
                        <>
                          فحصنا <strong style={{ color: 'var(--ink)' }}>{totalFetched}</strong> خبراً ولم نجد ذكراً لـ {selected.n}.
                          يمكنك إجراء تحليل عام للسهم، أو الانتقال للتبويب الأول وإدخال نص الخبر يدوياً.
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════
                 شريط الإجراءات السفلي
                ═══════════════════════════════════════════════ */}
            <div className="flex items-center justify-between" style={{ marginTop: '32px' }}>
              <span style={{
                fontSize: '12px',
                color: 'var(--muted)',
                fontFamily: 'var(--sans-lat)',
              }}>
                {selected
                  ? `محدّد: ${selected.t} — ${selected.n}`
                  : 'اختر سهماً لعرض أخباره'}
              </span>

              <button
                onClick={handleGenericStockAnalysis}
                disabled={!selected || isLoading}
                className="inline-flex items-center transition-colors"
                style={{
                  gap: '16px',
                  padding: '14px 26px',
                  background: 'transparent',
                  border: '1px solid var(--ink)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--sans)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: !selected || isLoading ? 'not-allowed' : 'pointer',
                  opacity: !selected || isLoading ? 0.5 : 1,
                }}
                title="تحليل عام للسهم بدون خبر معيّن"
              >
                <span>{isLoading ? 'جارٍ القياس…' : 'تحليل عام للسهم'}</span>
                <svg width="16" height="10" viewBox="0 0 18 10" fill="none">
                  <path d="M1 5 H 16 M 11 1 L 16 5 L 11 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══ مكوّن إعداد فردي (MARKET / DEPTH / SOURCE) ═══ */
function SettingItem({
  labelEn, value, first, last,
}: {
  labelEn: string
  value:   string
  first?:  boolean
  last?:   boolean
}) {
  return (
    <div
      className="flex-1"
      style={{
        paddingLeft:  last  ? 0 : '24px',
        marginLeft:   last  ? 0 : '24px',
        paddingRight: first ? 0 : undefined,
        borderLeft:   last  ? 'none' : '1px solid var(--rule)',
      }}
    >
      <div style={{
        fontFamily: 'var(--sans-lat)',
        fontSize: '10px',
        fontWeight: 500,
        color: 'var(--muted)',
        letterSpacing: '0.15em',
        marginBottom: '8px',
      }}>
        {labelEn}
      </div>
      <div className="flex items-center" style={{
        gap: '8px',
        fontSize: '15px',
        fontWeight: 500,
        color: 'var(--ink)',
      }}>
        {value}
        <span style={{
          width: 0,
          height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: '5px solid var(--ink)',
          marginTop: '2px',
        }} />
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      fontFamily: 'var(--mono)',
      background: 'var(--cream-deep)',
      border: '1px solid var(--rule)',
      padding: '2px 6px',
      fontSize: '11px',
      color: 'var(--ink)',
    }}>
      {children}
    </kbd>
  )
}
