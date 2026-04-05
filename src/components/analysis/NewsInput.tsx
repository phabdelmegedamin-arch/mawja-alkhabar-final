'use client'
import { useState } from 'react'
import { useAnalysisStore } from '@/store/analysis'
import { useAuthStore }     from '@/store/auth'
import type { AnalysisResult } from '@/types'

const FREE_TICKERS = ['أرامكو','aramco','2222','saudi aramco','أرامكو السعودية']

export default function NewsInput() {
  const { market, setMarket, waves, setWaves,
          setLoading, setResult, setError, addHistory, isLoading } = useAnalysisStore()
  const { session } = useAuthStore()
  const isPro = session?.plan === 'pro' || session?.plan === 'admin'

  const [text, setText]           = useState('')
  const [progress, setProgress]   = useState(0)
  const [progressLabel, setLabel] = useState('')
  const [activeTab, setActiveTab] = useState<'news' | 'stock'>('news')

  const canAnalyze = () => {
    if (isPro) return true
    return FREE_TICKERS.some(t => text.toLowerCase().includes(t))
  }

  const handleAnalyze = async () => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length < 15) {
      setError('أدخل نص الخبر (15 حرف على الأقل)')
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
    width: '100%',
    background: '#1C2128',
    border: '1px solid #3D444D',
    borderRadius: '8px',
    color: '#E6EDF3',
    fontFamily: 'Tajawal, Cairo, sans-serif',
    fontSize: '0.85rem',
    padding: '10px 12px',
    outline: 'none',
  }

  return (
    <div style={{
      background: '#161B22',
      border: '1px solid #30363D',
      borderRadius: '12px',
      padding: '16px',
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', borderBottom: '1px solid #30363D', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('news')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeTab === 'news' ? '1px solid rgba(0,229,255,0.3)' : '1px solid transparent',
            background: activeTab === 'news' ? 'rgba(0,229,255,0.1)' : 'transparent',
            color: activeTab === 'news' ? '#00E5FF' : '#8B949E',
          }}
        >
          ✏️ إدخال الخبر
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeTab === 'stock' ? '1px solid rgba(0,229,255,0.3)' : '1px solid transparent',
            background: activeTab === 'stock' ? 'rgba(0,229,255,0.1)' : 'transparent',
            color: activeTab === 'stock' ? '#00E5FF' : '#8B949E',
          }}
        >
          🔍 بحث بالسهم
        </button>
      </div>

      {/* Textarea */}
      {activeTab === 'news' && (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="الصق نص الخبر هنا… مثال: أعلنت ساما رفع سعر الفائدة الأساسي بمقدار 25 نقطة أساس"
          dir="auto"
          style={{
            ...inputStyle,
            height: '110px',
            resize: 'vertical',
            lineHeight: '1.6',
          }}
        />
      )}

      {/* Stock search */}
      {activeTab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '110px' }}>
          <input
            type="text"
            placeholder="ابحث باسم السهم أو كوده... مثال: أرامكو أو 2222"
            style={inputStyle}
            onChange={e => setText(e.target.value + ' أرامكو السعودية في السوق السعودي')}
          />
          <p style={{ fontSize: '0.75rem', color: '#8B949E', margin: 0 }}>
            {isPro ? 'وصول كامل لجميع الأسهم' : 'الباقة المجانية: أرامكو (2222) فقط'}
          </p>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
        <select
          value={market}
          onChange={e => setMarket(e.target.value as 'SA' | 'GLOBAL')}
          style={{ ...inputStyle, flex: 1, minWidth: '140px' }}
        >
          <option value="SA">السوق السعودي 🇸🇦</option>
          <option value="GLOBAL">التأثير العالمي 🌍</option>
        </select>

        <select
          value={waves}
          onChange={e => setWaves(e.target.value as '3' | '5')}
          style={{ ...inputStyle, flex: 1, minWidth: '120px' }}
        >
          <option value="3">عمق: 3 موجات</option>
          <option value="5">عمق: 5 موجات</option>
        </select>

        <button
          onClick={handleAnalyze}
          disabled={isLoading || text.trim().length < 15}
          style={{
            flex: 1,
            minWidth: '140px',
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: isLoading || text.trim().length < 15 ? 'not-allowed' : 'pointer',
            background: isLoading || text.trim().length < 15
              ? 'rgba(0,229,255,0.2)' : '#00E5FF',
            color: isLoading || text.trim().length < 15
              ? 'rgba(0,229,255,0.5)' : '#0D1117',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          {isLoading ? (
            <>
              <span style={{
                width: '14px', height: '14px',
                border: '2px solid #00E5FF',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
                display: 'inline-block',
              }} />
              جارٍ التحليل
            </>
          ) : 'تحليل الأثر ◀'}
        </button>
      </div>

      {/* Progress */}
      {isLoading && progress > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#8B949E', marginBottom: '4px' }}>
            <span>{progressLabel}</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: '4px', background: '#1C2128', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: '#00E5FF',
              borderRadius: '2px',
              width: `${progress}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Free plan notice */}
      {!isPro && (
        <p style={{ marginTop: '10px', fontSize: '0.72rem', color: '#8B949E', textAlign: 'center' }}>
          الباقة المجانية: أخبار أرامكو فقط •{' '}
          <a href="/subscribe" style={{ color: '#00E5FF' }}>اشترك للوصول الكامل ←</a>
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
