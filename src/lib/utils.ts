import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { SentimentDirection } from '@/types'

// ── Tailwind merge helper ─────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Sentiment helpers ─────────────────────────────
export function sentimentColor(dir: SentimentDirection) {
  return dir === 'pos' ? 'var(--gr)' : dir === 'neg' ? 'var(--rd)' : 'var(--yl)'
}
export function sentimentLabel(dir: SentimentDirection, lang: 'ar' | 'en' = 'ar') {
  const map = {
    ar: { pos: 'إيجابي', neg: 'سلبي', neu: 'محايد' },
    en: { pos: 'Positive', neg: 'Negative', neu: 'Neutral' },
  }
  return map[lang][dir]
}
export function sentimentBg(dir: SentimentDirection) {
  return dir === 'pos' ? 'bg-pos' : dir === 'neg' ? 'bg-neg' : 'bg-neu'
}

// ── Number formatters ─────────────────────────────
export function formatSAR(n: number, decimals = 0) {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency', currency: 'SAR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}
export function formatPct(n: number, decimals = 1) {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(decimals)}%`
}
export function formatNum(n: number) {
  return new Intl.NumberFormat('ar-SA').format(n)
}

// ── Time helpers ──────────────────────────────────
export function timeAgo(dateStr: string | number) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 60000
  if (diff < 1)    return 'الآن'
  if (diff < 60)   return `${Math.floor(diff)}د`
  if (diff < 1440) return `${Math.floor(diff / 60)}س`
  return `${Math.floor(diff / 1440)}ي`
}
export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// ── SHA-256 (browser + server) ────────────────────
export async function sha256(msg: string): Promise<string> {
  if (typeof window !== 'undefined') {
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
  }
  // Node.js
  const { createHash } = await import('crypto')
  return createHash('sha256').update(msg).digest('hex')
}

// ── Plan helpers ──────────────────────────────────
export function isPro(plan?: string | null) {
  return plan === 'pro' || plan === 'admin'
}
export function canAnalyzeTicker(ticker: string, plan?: string | null) {
  const FREE = ['2222']
  return isPro(plan) || FREE.includes(ticker)
}

// ── Text helpers ──────────────────────────────────
export function extractHeadline(text: string, maxLen = 80) {
  const line = text.split(/[\n.،]/)[0].trim()
  return line.length > maxLen ? line.slice(0, maxLen) + '…' : line
}
export function truncate(text: string, len: number) {
  return text.length > len ? text.slice(0, len) + '…' : text
}

// ── Hash function for deduplication ───────────────
export function simpleHash(s: string): string {
  let h = 0
  for (let i = 0; i < Math.min(s.length, 50); i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return 'mw' + Math.abs(h).toString(36)
}
