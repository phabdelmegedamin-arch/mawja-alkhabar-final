'use client'
import { useState, useCallback, useEffect } from 'react'
import { useAnalysisStore } from '@/store/analysis'
import { useAuthStore }     from '@/store/auth'
import type { AnalysisResult } from '@/types'

const FREE_TICKERS = ['أرامكو','aramco','2222','saudi aramco','أرامكو السعودية']

const SA_STOCKS: Record<string, { name: string; sector: string }> = {
  '2222': { name: 'أرامكو السعودية',    sector: 'الطاقة' },
  '1180': { name: 'الأهلي السعودي',      sector: 'البنوك' },
  '1120': { name: 'الراجحي',            sector: 'البنوك' },
  '2010': { name: 'سابك',               sector: 'البتروكيماويات' },
  '7010': { name: 'الاتصالات السعودية',  sector: 'الاتصالات' },
  '7020': { name: 'موبايلي',            sector: 'الاتصالات' },
  '7030': { name: 'زين السعودية',        sector: 'الاتصالات' },
  '2380': { name: 'بترو رابغ',          sector: 'البتروكيماويات' },
  '2350': { name: 'سافكو',              sector: 'البتروكيماويات' },
  '1010': { name: 'الرياض',            sector: 'البنوك' },
  '1030': { name: 'السعودي الفرنسي',     sector: 'البنوك' },
  '1060': { name: 'الجزيرة',           sector: 'البنوك' },
  '1080': { name: 'العربي',            sector: 'البنوك' },
  '1140': { name: 'البلاد',            sector: 'البنوك' },
  '4140': { name: 'المراعي',           sector: 'الأغذية' },
  '2280': { name: 'الزامل الصناعية',    sector: 'الصناعة' },
  '5110': { name: 'السعودية للكهرباء',  sector: 'المرافق' },
  '4008': { name: 'العثيم',            sector: 'التجزئة' },
  '4007': { name: 'الحكير',            sector: 'التجزئة' },
  '8010': { name: 'مجموعة تداول',       sector: 'المالية' },
  '8050': { name: 'التعاونية',         sector: 'التأمين' },
  '4050': { name: 'سابتا',            sector: 'النقل' },
  '2060': { name: 'الغاز والتصنيع',    sector: 'الطاقة' },
  '2330': { name: 'المتقدمة للحفر',    sector: 'الطاقة' },
  '1150': { name: 'أملاك',            sector: 'التمويل' },
  '6010': { name: 'التصنيع',           sector: 'الصناعة' },
  '3030': { name: 'المتقدمة',          sector: 'البتروكيماويات' },
  '2090': { name: 'نماء للكيماويات',   sector: 'البتروكيماويات' },
}

function searchStocks(query: string) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase().trim()
  return Object.entries(SA_STOCKS)
    .filter(([ticker, info]) =>
      ticker.includes(q) ||
      info.name.includes(query) ||
      info.name.toLowerCase().includes(q) ||
      info.sector.includes(query)
    )
    .slice(0, 6)
    .map(([ticker, info]) => ({ ticker, ...info }))
}

// ─── جلب أخبار السهم من /api/news مع فلترة بالاسم أو الكود ───
async function fetchStockNews(
  stock: { ticker: string; name: string; sector: string }
): Promise<Array<{ title: string; text: string; desc?: string; pubDate?: string; source?: string }>> {
  try {
    const res  = await fetch('/api/news')
    const data = await res.json()
    if (!data.success || !Array.isArray(data.data)) return []

    const keywords = [
      stock.ticker,
      stock.name,
      stock.name.split(' ')[0],          // أول كلمة من الاسم
      stock.sector,
    ].map(k => k.toLowerCase())

    const filtered = data.data.filter((item: any) => {
      const haystack = `${item.title ?? ''} ${item.text ?? ''} ${item.desc ?? ''}`.toLowerCase()
      return keywords.some(k => haystack.includes(k))
    })

    // إذا لم تجد أخبار مطابقة أعد آخر 5 أخبار عامة مع إشارة
    return filtered.length > 0
      ? filtered.slice(0, 8)
      : data.data.slice(0, 5).map((item: any) => ({
          ...item,
          title: `[عام] ${item.title}`,
        }))
  } catch {
    return []
  }
}

export default function NewsInput() {
  const { market, setMarket, waves, setWaves,
          setLoading, setResult, setError, addHistory, isLoading } = useAnalysisStore()
  const { session } = useAuthStore()
  const isPro = session?.plan === 'pro' || session?.plan === 'admin'

  const [text, setText]                   = useState('')
  const [progress, setProgress]           = useState(0)
  const [progressLabel, setLabel]         = useState('')
  const [activeTab, setActiveTab]         = useState<'news' | 'stock'>('news')
  const [stockQuery, setStockQuery]       = useState('')
  const [suggestions, setSuggestions]     = useState<Array<{ ticker: string; name: string; sector: string }>>([])
  const [selectedStock, setSelectedStock] = useState<{ ticker: string; name: string; sector: string } | null>(null)

  // ─── حالات جديدة لقائمة أخبار السهم ───
  const [stockNews, setStockNews]           = useState<Array<{ title: string; text: string; desc?: string; pubDate?: string; source?: string }>>([])
  const [stockNewsLoading, setStockNewsLoading] = useState(false)
  const [selectedNewsIdx, setSelectedNewsIdx]   = useState<number | null>(null)

  useEffect(() => {
    const handler = (e: CustomEvent<{ text: string }>) => {
      setText(e.detail.text)
      setActiveTab('news')
      setStockQuery('')
      setSuggestions([])
      setSelectedStock(null)
      setStockNews([])
      setSelectedNewsIdx(null)
    }
    window.addEventListener('mw:select-news', handler as EventListener)
    return () => window.removeEventListener('mw:select-news', handler as EventListener)
  }, [])

  const canAnalyze = () => {
    if (isPro) return true
    return FREE_TICKERS.some(t => text.toLowerCase().includes(t))
  }

  const handleStockSearch = useCallback((query: string) => {
    setStockQuery(query)
    setSelectedStock(null)
    setSuggestions(query.length >= 2 ? searchStocks(query) : [])
    setStockNews([])
    setSelectedNewsIdx(null)
    setText('')
  }, [])

  // ─── عند اختيار سهم: جلب أخباره فوراً ───
  const handleSelectStock = useCallback(async (stock: { ticker: string; name: string; sector: string }) => {
    setSelectedStock(stock)
    setStockQuery(`${stock.ticker} - ${stock.name}`)
    setSuggestions([])
    setStockNews([])
    setSelectedNewsIdx(null)
    setText('')

    setStockNewsLoading(true)
    const news = await fetchStockNews(stock)
    setStockNews(news)
    setStockNewsLoading(false)
  }, [])

  // ─── عند اختيار خبر من القائمة ───
  const handleSelectNewsItem = useCallback((idx: number) => {
    setSelectedNewsIdx(idx)
    const item = stockNews[idx]
    if (item) {
      // نستخدم النص الكامل للتحليل، أو العنوان إذا لم يوجد نص
      setText(item.text && item.text.length > 20 ? item.text : item.title)
    }
  }, [stockNews])

  const handleAnalyze = async () => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length < 15) {
      setError(activeTab === 'stock' ? 'اختر خبراً من القائمة أو اكتب نصاً للتحليل' : 'أدخل نص الخبر (15 حرف على الأقل)')
      return
    }
    if (!canAnalyze()) {
      window.location.href = '/subscribe'
      return
    }
    setLoading(true)
    setError(null)
    setProgress(0)
    try {
      const steps: [number, string][] = [
        [15, 'استخراج الكلمات المفتاحية...'],
        [35, 'تحليل المشاعر...'],
        [55, 'كشف القطاعات...'],
        [75, 'بناء موجات التأثير...'],
        [90, 'إعداد النتائج...'],
      ]
      let stepIdx = 0
      const timer = setInterval(() => {
        if (stepIdx < steps.length) {
          setProgress(steps[stepIdx][0])
          setLabel(steps[stepIdx][1])
          stepIdx++
        }
      }, 300)
      const apiKey = typeof window !== 'undefined'
        ? localStorage.getItem('anthropic_key') ?? '' : ''
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'x-api-key': apiKey }),
        },
        body: JSON.stringify({ text: trimmed, market, waves, useAI: !!apiKey }),
      })
      clearInterval(timer)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'خطأ في التحليل')
      }
      const data   = await res.json()
      const result: AnalysisResult = data.data
      setProgress(100)
      setLabel('اكتمل التحليل ✓')
      setTimeout(() => {
        setResult(result)
        setLoading(false)
        setProgress(0)
        addHistory({
          id: Date.now(), ts: result.ts,
          text: trimmed.slice(0, 300),
          headline: trimmed.split(/[\n.،]/)[0].trim().slice(0, 80),
          primary: result.primary, primaryLabel: '',
          sentiment: result.sentiment,
          stocks: result.stocks.slice(0, 5).map(s => ({
            ticker: s.t ?? '', name: s.n ?? '', impact: s.pct ?? '—',
          })),
          keywords: [], confidence: result.confidence, usedAI: result.usedAI,
        })
      }, 400)
    } catch (err: any) {
      setError(err.message ?? 'خطأ غير متوقع')
      setLoading(false)
      setProgress(0)
    }
  }

  const inputStyle = {
    width:        '100%',
    background:   'var(--bg3)',
    border:       '1px solid var(--b2)',
    borderRadius: '8px',
    color:        'var(--tx)',
    fontFamily:   'Tajawal, Cairo, sans-serif',
    fontSize:     '0.85rem',
    padding:      '10px 12px',
    outline:      'none',
    boxSizing:    'border-box' as const,
  }

  const analyzeReady = activeTab === 'stock'
    ? text.trim().length >= 15
    : text.trim().length >= 15

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: '12px', padding: '16px' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', borderBottom: '1px solid var(--b1)', paddingBottom: '12px' }}>
        {(['news', 'stock'] as const).map(tab => (
          <button key={tab}
            onClick={() => {
              setActiveTab(tab)
              setText('')
              setStockQuery('')
              setSuggestions([])
              setSelectedStock(null)
              setStockNews([])
              setSelectedNewsIdx(null)
            }}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              border:     activeTab === tab ? '1px solid rgba(0,229,255,0.3)' : '1px solid transparent',
              background: activeTab === tab ? 'rgba(0,229,255,0.1)'           : 'transparent',
              color:      activeTab === tab ? '#00E5FF' : 'var(--t2)',
            }}>
            {tab === 'news' ? '✏️ إدخال الخبر' : '🔍 بحث بالسهم'}
          </button>
        ))}
      </div>

      {/* ── تاب إدخال الخبر ── */}
      {activeTab === 'news' && (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="الصق نص الخبر هنا… مثال: أعلنت ساما رفع سعر الفائدة الأساسي بمقدار 25 نقطة أساس"
          dir="auto"
          style={{ ...inputStyle, height: '110px', resize: 'vertical', lineHeight: '1.6' }}
        />
      )}

      {/* ── تاب البحث بالسهم ── */}
      {activeTab === 'stock' && (
        <div style={{ position: 'relative' }}>

          {/* حقل البحث */}
          <input
            type="text"
            value={stockQuery}
            placeholder="ابحث باسم السهم أو كوده... مثال: أرامكو أو 2222"
            style={inputStyle}
            onChange={e => handleStockSearch(e.target.value)}
            autoComplete="off"
          />

          {/* اقتراحات الأسهم */}
          {suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, left: 0,
              background:   'var(--bg3)',
              border:       '1px solid var(--b2)',
              borderRadius: '8px',
              marginTop:    '4px',
              zIndex:       50,
              overflow:     'hidden',
              boxShadow:    '0 8px 24px rgba(0,0,0,0.25)',
            }}>
              {suggestions.map(stock => (
                <button key={stock.ticker} onClick={() => handleSelectStock(stock)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'transparent', border: 'none',
                    borderBottom: '1px solid var(--b1)',
                    cursor: 'pointer', textAlign: 'right',
                    color:      'var(--tx)',
                    fontFamily: 'Tajawal, Cairo, sans-serif',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg4)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{stock.name}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--t2)' }}>{stock.sector}</span>
                  </div>
                  <span style={{
                    fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: '#00E5FF',
                    background: 'rgba(0,229,255,0.1)', padding: '2px 8px', borderRadius: '4px',
                  }}>{stock.ticker}</span>
                </button>
              ))}
            </div>
          )}

          {/* السهم المختار */}
          {selectedStock && (
            <div style={{
              marginTop: '8px', padding: '8px 12px',
              background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--t2)' }}>
                {stockNewsLoading ? 'جارٍ جلب الأخبار...' : `اختر خبراً من القائمة أدناه لتحليل تأثيره`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#00E5FF', fontWeight: 700 }}>
                  {selectedStock.ticker}
                </span>
                <button
                  onClick={() => {
                    setSelectedStock(null)
                    setStockQuery('')
                    setText('')
                    setSuggestions([])
                    setStockNews([])
                    setSelectedNewsIdx(null)
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}>
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* ─── قائمة أخبار السهم ─── */}
          {selectedStock && !stockNewsLoading && stockNews.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--t2)', marginBottom: '6px' }}>
                📰 آخر أخبار {selectedStock.name} — اختر خبراً ثم اضغط «تحليل الأثر»
              </p>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '6px',
                maxHeight: '260px', overflowY: 'auto',
              }}>
                {stockNews.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectNewsItem(idx)}
                    style={{
                      width: '100%', textAlign: 'right', padding: '10px 14px',
                      background: selectedNewsIdx === idx ? 'rgba(0,229,255,0.1)' : 'var(--bg3)',
                      border: selectedNewsIdx === idx
                        ? '1px solid rgba(0,229,255,0.4)'
                        : '1px solid var(--b2)',
                      borderRadius: '8px', cursor: 'pointer',
                      color: 'var(--tx)',
                      fontFamily: 'Tajawal, Cairo, sans-serif',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (selectedNewsIdx !== idx)
                        e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)'
                    }}
                    onMouseLeave={e => {
                      if (selectedNewsIdx !== idx)
                        e.currentTarget.style.borderColor = 'var(--b2)'
                    }}
                  >
                    <div style={{ fontSize: '0.83rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '4px' }}>
                      {item.title}
                    </div>
                    {item.desc && (
                      <div style={{
                        fontSize: '0.75rem', color: 'var(--t2)', lineHeight: 1.4,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {item.desc}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.7rem', color: 'var(--t2)' }}>
                      {item.source && <span>📡 {item.source}</span>}
                      {item.pubDate && <span>🕐 {new Date(item.pubDate).toLocaleDateString('ar-SA')}</span>}
                      {selectedNewsIdx === idx && (
                        <span style={{ color: '#00E5FF', marginRight: 'auto' }}>✓ محدد</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* حالة: لا توجد أخبار */}
          {selectedStock && !stockNewsLoading && stockNews.length === 0 && (
            <div style={{
              marginTop: '10px', padding: '12px', textAlign: 'center',
              background: 'var(--bg3)', border: '1px solid var(--b2)',
              borderRadius: '8px', fontSize: '0.8rem', color: 'var(--t2)',
            }}>
              لم يتم العثور على أخبار لهذا السهم حالياً
            </div>
          )}

          {/* حالة: جارٍ التحميل */}
          {stockNewsLoading && (
            <div style={{
              marginTop: '10px', padding: '16px', textAlign: 'center',
              background: 'var(--bg3)', border: '1px solid var(--b2)',
              borderRadius: '8px', fontSize: '0.8rem', color: 'var(--t2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <span style={{
                width: '14px', height: '14px', border: '2px solid #00E5FF',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite', display: 'inline-block',
              }} />
              جارٍ جلب أخبار {selectedStock?.name}...
            </div>
          )}

          <p style={{ fontSize: '0.75rem', color: 'var(--t2)', margin: '8px 0 0 0' }}>
            {isPro ? 'وصول كامل لجميع الأسهم' : 'الباقة المجانية: أرامكو (2222) فقط'}
          </p>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
        <select value={market} onChange={e => setMarket(e.target.value as 'SA' | 'GLOBAL')}
          style={{ ...inputStyle, flex: 1, minWidth: '140px' }}>
          <option value="SA">السوق السعودي 🇸🇦</option>
          <option value="GLOBAL">التأثير العالمي 🌍</option>
        </select>
        <select value={waves} onChange={e => setWaves(e.target.value as '3' | '5')}
          style={{ ...inputStyle, flex: 1, minWidth: '120px' }}>
          <option value="3">عمق: 3 موجات</option>
          <option value="5">عمق: 5 موجات</option>
        </select>
        <button onClick={handleAnalyze} disabled={isLoading || !analyzeReady}
          style={{
            flex: 1, minWidth: '140px', padding: '10px 16px', borderRadius: '8px', border: 'none',
            fontWeight: 700, fontSize: '0.85rem',
            cursor:     isLoading || !analyzeReady ? 'not-allowed' : 'pointer',
            background: isLoading || !analyzeReady ? 'rgba(0,229,255,0.2)' : '#00E5FF',
            color:      isLoading || !analyzeReady ? 'rgba(0,229,255,0.5)' : 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s',
          }}>
          {isLoading ? (
            <>
              <span style={{
                width: '14px', height: '14px', border: '2px solid #00E5FF',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite', display: 'inline-block',
              }} />
              جارٍ التحليل
            </>
          ) : 'تحليل الأثر ◀'}
        </button>
      </div>

      {/* Progress */}
      {isLoading && progress > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--t2)', marginBottom: '4px' }}>
            <span>{progressLabel}</span><span>{progress}%</span>
          </div>
          <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#00E5FF', borderRadius: '2px', width: `${progress}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {/* Free plan notice */}
      {!isPro && (
        <p style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--t2)', textAlign: 'center' }}>
          الباقة المجانية: أخبار أرامكو فقط •{' '}
          <a href="/subscribe" style={{ color: '#00E5FF' }}>اشترك للوصول الكامل ←</a>
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
