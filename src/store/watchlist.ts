'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchlistEntry, Holding } from '@/types'

interface WatchlistState {
  items:  WatchlistEntry[]
  add:    (ticker: string, name: string) => void
  remove: (ticker: string) => void
  has:    (ticker: string) => boolean
  clear:  () => void
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (ticker, name) => set((s) => ({
        items: s.items.find(i => i.ticker === ticker)
          ? s.items
          : [...s.items, { ticker, name, addedAt: new Date().toISOString() }],
      })),
      remove: (ticker) => set((s) => ({
        items: s.items.filter(i => i.ticker !== ticker),
      })),
      has:   (ticker) => get().items.some(i => i.ticker === ticker),
      clear: () => set({ items: [] }),
    }),
    { name: 'mw-watchlist' }
  )
)

// ── Portfolio ────────────────────────────────────
interface PortfolioState {
  holdings:  Holding[]
  add:       (h: Omit<Holding, 'added'>) => void
  remove:    (ticker: string) => void
  update:    (ticker: string, qty: number, avgPrice: number) => void
  clear:     () => void
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      holdings: [],
      add: (h) => set((s) => {
        const existing = s.holdings.find(x => x.ticker === h.ticker)
        if (existing) {
          const newQty   = existing.qty + h.qty
          const avgPrice = (existing.avgPrice * existing.qty + h.avgPrice * h.qty) / newQty
          return {
            holdings: s.holdings.map(x =>
              x.ticker === h.ticker ? { ...x, qty: newQty, avgPrice } : x
            ),
          }
        }
        return { holdings: [...s.holdings, { ...h, added: Date.now() }] }
      }),
      remove: (ticker) => set((s) => ({
        holdings: s.holdings.filter(h => h.ticker !== ticker),
      })),
      update: (ticker, qty, avgPrice) => set((s) => ({
        holdings: s.holdings.map(h =>
          h.ticker === ticker ? { ...h, qty, avgPrice } : h
        ),
      })),
      clear: () => set({ holdings: [] }),
    }),
    { name: 'mw-portfolio' }
  )
)
