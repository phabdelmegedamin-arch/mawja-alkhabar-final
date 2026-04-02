'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AnalysisResult, HistoryEntry } from '@/types'

interface AnalysisState {
  // Current analysis
  result:     AnalysisResult | null
  isLoading:  boolean
  error:      string | null
  inputText:  string
  market:     'SA' | 'GLOBAL'
  waves:      '3' | '5'

  // History (local)
  history:    HistoryEntry[]

  // Actions
  setInput:   (text: string) => void
  setMarket:  (m: 'SA' | 'GLOBAL') => void
  setWaves:   (w: '3' | '5') => void
  setLoading: (b: boolean) => void
  setError:   (e: string | null) => void
  setResult:  (r: AnalysisResult | null) => void
  addHistory: (entry: HistoryEntry) => void
  clearHistory: () => void
  deleteHistory: (id: number) => void
  reset:      () => void
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set) => ({
      result:    null,
      isLoading: false,
      error:     null,
      inputText: '',
      market:    'SA',
      waves:     '3',
      history:   [],

      setInput:   (text)   => set({ inputText: text }),
      setMarket:  (market) => set({ market }),
      setWaves:   (waves)  => set({ waves }),
      setLoading: (b)      => set({ isLoading: b }),
      setError:   (e)      => set({ error: e }),
      setResult:  (r)      => set({ result: r }),

      addHistory: (entry) => set((s) => ({
        history: [entry, ...s.history].slice(0, 200),
      })),
      clearHistory:  () => set({ history: [] }),
      deleteHistory: (id) => set((s) => ({
        history: s.history.filter(h => h.id !== id),
      })),
      reset: () => set({ result: null, error: null, isLoading: false }),
    }),
    {
      name:    'mw-analysis',
      partialize: (s) => ({
        history: s.history,
        market:  s.market,
        waves:   s.waves,
      }),
    }
  )
)
