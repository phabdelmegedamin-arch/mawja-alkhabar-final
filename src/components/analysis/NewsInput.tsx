'use client'
import { useState } from 'react'
import { useAnalysisStore } from '@/store/analysis'
import { useAuthStore }     from '@/store/auth'
import { cn } from '@/lib/utils'
import type { AnalysisResult } from '@/types'

const FREE_TICKERS = ['أرامكو','aramco','2222','saudi aramco','أرامكو السعودية']

export default function NewsInput() {
  const { market, setMarket, waves, setWaves,
          setLoading, setResult, setError, addHistory, isLoading } = useAnalysisStore()
  const { session } = useAuthStore()
  const isPro = session?.plan === 'pro' || session?.plan === 'admin'

  const [text, setText]         = useState('')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [activeTab, setActiveTab] = useState<'news' | 'stock'>('news')

  const canAnalyze = () => {
    if (isPro) return true
    const lower = text.toLowerCase()
    return FREE_TICKERS.some(t => lower.includes(t))
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
          setProgressLabel(steps[stepIdx][1])
          stepIdx++
        }
      }, 300)

      const apiKey = typeof window !== 'undefined'
        ? localStorage.getItem('anthropic_key') ?? ''
        : ''

      const res = await fetch('/api/analyze', {
        method:  'POST',
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

      const data = await res.json()
      const result: AnalysisResult = data.data

      setProgress(100)
      setProgressLabel('اكتمل التحليل ✓')

      setTimeout(() => {
        setResult(result)
        setLoading(false)
        setProgress(0)
        addHistory({
          id:           Date.now(),
          ts:           result.ts,
          text:         trimmed.slice(0, 300),
          headline:     trimmed.split(/[\n.،]/)[0].trim().slice(0, 80),
          primary:      result.primary,
          primaryLabel: '',
          sentiment:    result.sentiment,
          stocks:       result.stocks.slice(0, 5).map(s => ({
            ticker: s.t ?? '', name: s.n ?? '', impact: s.pct ?? '—',
          })),
          keywords:    [],
          confidence:  result.confidence,
          usedAI:      result.usedAI,
        })
      }, 400)

    } catch (err: any) {
      setError(err.message ?? 'خطأ غير متوقع')
      setLoading(false)
      setProgress(0)
    }
  }

  return (
    <div className="card p-4">
      {/* Tabs */}
      <div className="flex gap-1 mb-3 border-b border-b-1 pb-3">
        <button
          onClick={() => setActiveTab('news')}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            activeTab === 'news'
              ? 'bg-ac/10 text-ac border border-ac/20'
              : 'text-tx-3 hover:text-tx-2'
          )}
        >
          ✏️ إدخال الخبر
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            activeTab === 'stock'
              ? 'bg-ac/10 text-ac border border-ac/20'
              : 'text-tx-3 hover:text-tx-2'
          )}
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
          className="w-full h-28 md:h-32 px-3 py-2.5 resize-none text-sm
                     bg-bg3 border border-b-2 rounded-lg text-tx
                     placeholder:text-tx-3 transition-all duration-200"
          dir="auto"
        />
      )}

      {/* Stock search */}
      {activeTab === 'stock' && (
        <div className="h-28 md:h-32 flex flex-col gap-2">
          <input
            type="text"
            placeholder="ابحث باسم السهم أو كوده... مثال: أرامكو أو 2222"
            className="w-full px-3 py-2.5 text-sm bg-bg3 border border-b-2 rounded-lg text-tx placeholder:text-tx-3"
            onChange={e => setText(e.target.value + ' في السوق السعودي')}
          />
          <p className="text-xs text-tx-3">
            {isPro ? 'وصول كامل لجميع الأسهم' : 'الباقة المجانية: أرامكو (2222) فقط'}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mt-3">
        <select
          value={market}
          onChange={e => setMarket(e.target.value as 'SA' | 'GLOBAL')}
          className="flex-1 min-w-[140px] px-2 py-2 text-sm rounded-lg bg-bg3 border border-b-2 text-tx-2"
        >
          <option value="SA">السوق السعودي 🇸🇦</option>
          <option value="GLOBAL">التأثير العالمي 🌍</option>
        </select>

        <select
          value={waves}
          onChange={e => setWaves(e.target.value as '3' | '5')}
          className="flex-1 min-w-[120px] px-2 py-2 text-sm rounded-lg bg-bg3 border border-b-2 text-tx-2"
        >
          <option value="3">عمق: 3 موجات</option>
          <option value="5">عمق: 5 موجات</option>
        </select>

        <button
          onClick={handleAnalyze}
          disabled={isLoading || text.trim().length < 15}
          className={cn(
            'flex-1 min-w-[140px] px-4 py-2 rounded-lg font-bold text-sm',
            'flex items-center justify-center gap-2 transition-all duration-200',
            isLoading || text.trim().length < 15
              ? 'bg-ac/20 text-ac/50 cursor-not-allowed'
              : 'bg-ac text-bg hover:bg-ac/90 active:scale-95'
          )}
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-ac border-t-transparent rounded-full animate-spin" />
              <span>جارٍ التحليل</span>
            </>
          ) : (
            'تحليل الأثر ◀'
          )}
        </button>
      </div>

      {/* Progress */}
      {isLoading && progress > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-tx-3 mb-1">
            <span className="font-mono">{progressLabel}</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="h-1 bg-bg3 rounded-full overflow-hidden">
            <div
              className="h-full bg-ac rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Free plan notice */}
      {!isPro && (
        <p className="mt-2.5 text-xs text-tx-3 text-center">
          الباقة المجانية: أخبار أرامكو فقط •{' '}
          <a href="/subscribe" className="text-ac hover:underline">اشترك للوصول الكامل ←</a>
        </p>
      )}
    </div>
  )
}
