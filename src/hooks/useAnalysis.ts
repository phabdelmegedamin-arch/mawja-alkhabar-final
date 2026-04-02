'use client'
import { useCallback } from 'react'
import { useAnalysisStore } from '@/store/analysis'
import { useAuthStore }     from '@/store/auth'
import { extractHeadline }  from '@/lib/utils'
import type { AnalysisResult } from '@/types'

const FREE_KEYWORDS = ['أرامكو','aramco','2222','saudi aramco','أرامكو السعودية']

export function useAnalysis() {
  const store   = useAnalysisStore()
  const { session } = useAuthStore()
  const isPro   = session?.plan === 'pro' || session?.plan === 'admin'

  const canRunFree = useCallback((text: string) => {
    const lower = text.toLowerCase()
    return FREE_KEYWORDS.some(k => lower.includes(k))
  }, [])

  const run = useCallback(async (text?: string) => {
    const inputText = text ?? store.inputText
    if (!inputText || inputText.trim().length < 15) {
      store.setError('أدخل نص الخبر (15 حرف على الأقل)')
      return null
    }

    // Gate: free plan only for Aramco
    if (!isPro && !canRunFree(inputText)) {
      return 'NEED_SUBSCRIPTION'
    }

    store.setLoading(true)
    store.setError(null)

    try {
      const apiKey = typeof window !== 'undefined'
        ? (localStorage.getItem('anthropic_key') ?? '')
        : ''
      const useAI = !!apiKey

      const res = await fetch('/api/analyze', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'x-api-key': apiKey }),
        },
        body: JSON.stringify({
          text:   inputText.trim(),
          market: store.market,
          waves:  store.waves,
          useAI,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'خطأ في التحليل')
      }

      const { data }: { data: AnalysisResult } = await res.json()
      store.setResult(data)

      // Save to local history
      store.addHistory({
        id:           Date.now(),
        ts:           data.ts,
        text:         inputText.slice(0, 300),
        headline:     extractHeadline(inputText),
        primary:      data.primary,
        primaryLabel: '',
        sentiment:    data.sentiment,
        stocks:       data.stocks.slice(0, 5).map(s => ({
          ticker: s.t ?? '', name: s.n ?? '', impact: s.pct ?? '—',
        })),
        keywords:     [],
        confidence:   data.confidence,
        usedAI:       data.usedAI,
      })

      return data
    } catch (err: any) {
      store.setError(err.message ?? 'خطأ غير متوقع')
      return null
    } finally {
      store.setLoading(false)
    }
  }, [store, isPro, canRunFree])

  return {
    run,
    canRunFree,
    result:    store.result,
    isLoading: store.isLoading,
    error:     store.error,
    history:   store.history,
    clearHistory:  store.clearHistory,
    deleteHistory: store.deleteHistory,
  }
}
