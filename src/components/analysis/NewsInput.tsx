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

  const handleStockSubmit = () => {
    if (!selected) { setError('اختر سهماً أولاً'); return }
    const text = `تحليل أداء سهم ${selected.n} (${selected.t}) في قطاع ${selected.sector}.`
    setInput(text)
    runAnalysis(text)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (tab === 'news') handleNewsSubmit()
      else handleStockSubmit()
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

            <div className="flex items-center justify-between" style={{ marginTop: '40px' }}>
              <span style={{
                fontSize: '12px',
                color: 'var(--muted)',
                fontFamily: 'var(--sans-lat)',
              }}>
                {selected ? `محدّد: ${selected.t} — ${selected.n}` : 'اختر سهماً للقياس'}
              </span>

              <button
                onClick={handleStockSubmit}
                disabled={!selected || isLoading}
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
                  cursor: !selected || isLoading ? 'not-allowed' : 'pointer',
                  opacity: !selected || isLoading ? 0.6 : 1,
                }}
              >
                <span>{isLoading ? 'جارٍ القياس…' : 'قياس وضع السهم'}</span>
                <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
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
