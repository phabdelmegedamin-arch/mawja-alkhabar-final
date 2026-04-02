// ══════════════════════════════════════════════════
// موجة الخبر — محرك NLP (TypeScript)
// ══════════════════════════════════════════════════
import type { SentimentResult, SectorDetectResult, SectorKey } from '@/types'
import { DB, RELS } from '@/data/market-db'

// ── القواميس ──────────────────────────────────────
const NEG: Record<string, number> = {
  'انخفض':2.0,'انخفضت':2.0,'تراجع':2.0,'تراجعت':2.0,'هبط':2.0,'هبطت':2.0,
  'تدهور':2.0,'تدهورت':2.0,'خسارة':2.0,'خسائر':2.0,'تقلص':1.5,
  'أزمة':2.0,'إفلاس':3.0,'انهيار':3.0,'ركود':2.0,'انكماش':2.0,
  'غرامة':2.0,'عقوبات':2.0,'تشديد':1.5,'تسريح':2.0,'فشل':2.0,
  'تضرر':1.5,'تضررت':1.5,'تضغط':1.5,
  'رفع الفائدة':2.5,'ترفع الفائدة':2.5,'رفعت الفائدة':2.5,
  'رفع سعر الفائدة':2.5,'رفعت أسعار الفائدة':2.5,
  'ترفع أسعار الفائدة':2.5,'رفع أسعار الفائدة':2.5,
  'زيادة الفائدة':2.0,'ارتفاع الفائدة':2.0,'تشديد نقدي':2.0,
  'تراجع حاد':3.0,'خسارة صافية':3.0,'تراجع الأرباح':2.0,
  'تراجع الإيرادات':2.0,'خفض الأرباح':2.0,'أزمة مالية':3.0,
  'صعوبات مالية':2.0,'خسائر فادحة':3.0,'هبوط حاد':3.0,
  'انهيار السوق':3.0,
}

const POS: Record<string, number> = {
  'ارتفع':2.0,'ارتفعت':2.0,'ارتفاع':1.5,'نما':2.0,'نمو':2.0,'نمت':2.0,
  'زيادة':1.0,'قفز':2.0,'قفزت':2.0,'تحسن':1.5,'تحسنت':1.5,
  'صعد':1.5,'صعدت':1.5,'تجاوز':2.0,'تجاوزت':2.0,
  'توسعة':2.0,'خطط توسع':2.0,'مشروع جديد':1.5,
  'صفقة':1.5,'اتفاقية':1.5,'شراكة':1.5,
  'إطلاق':1.5,'افتتاح':1.5,'تدشين':1.5,
  'خفض الفائدة':2.0,'تحفيز':1.5,'دعم حكومي':1.5,
  'انتعاش':2.0,'ازدهار':2.0,'طفرة':2.0,'نمو اقتصادي':2.0,
  'نجح':1.5,'نجحت':1.5,'استثمارات':1.5,'أرباح':1.0,'ربح':1.0,
  'توزيع أرباح':2.5,'أرباح قياسية':3.0,'نمو الأرباح':2.0,
  'زيادة الأرباح':2.0,'ارتفاع الأرباح':2.0,
  'أعلى مستوى':2.0,'مستوى قياسي':2.0,'رقم قياسي':2.0,
  'نمو قياسي':2.5,'أرباح مرتفعة':2.0,
}

const NEGATORS = [' لا ', ' لم ', ' لن ', ' ليس ', ' ليست ', ' غير ']

// ── كشف النفي ─────────────────────────────────────
function isNegated(text: string, word: string): boolean {
  const idx = text.indexOf(word)
  if (idx < 0) return false
  const before = text.slice(Math.max(0, idx - 22), idx)
  return NEGATORS.some(n => before.includes(n))
}

// ── تحليل المشاعر ─────────────────────────────────
export function analyzeSentiment(text: string): SentimentResult {
  const t = ' ' + text + ' '
  let ns = 0, ps = 0
  const nw: string[] = [], pw: string[] = []

  for (const [word, weight] of Object.entries(NEG)) {
    if (t.includes(word)) {
      if (isNegated(t, word)) ps += weight * 0.4
      else { ns += weight; nw.push(word) }
    }
  }
  for (const [word, weight] of Object.entries(POS)) {
    if (t.includes(word)) {
      if (isNegated(t, word)) ns += weight * 0.4
      else { ps += weight; pw.push(word) }
    }
  }

  const diff = ps - ns
  const tot  = ps + ns

  if (tot < 0.5) {
    return { score:20, dir:'neu', pos_words:[], neg_words:[],
             intensity:'low', top_cat:'general', raw_score:0 }
  }

  let dir: 'pos' | 'neg' | 'neu'
  let score: number

  if (diff > 0.3) {
    dir   = 'pos'
    score = Math.min(92, Math.round(25 + (ps / tot) * 68))
  } else if (diff < -0.3) {
    dir   = 'neg'
    score = -Math.min(92, Math.round(25 + (ns / tot) * 68))
  } else {
    dir   = 'neu'
    score = Math.round(diff * 15)
  }

  return {
    score, dir,
    pos_words: pw.slice(0, 5),
    neg_words: nw.slice(0, 5),
    intensity: Math.abs(score) > 55 ? 'high' : Math.abs(score) > 25 ? 'medium' : 'low',
    top_cat:   dir === 'pos' ? 'growth' : dir === 'neg' ? 'risk' : 'neutral',
    raw_score: diff,
  }
}

// ── كشف القطاعات ──────────────────────────────────
export function detectSectors(text: string): SectorDetectResult {
  const scores: Record<string, number> = {}

  for (const [key, sector] of Object.entries(DB)) {
    let score = 0
    for (const kw of sector.kw) {
      if (text.includes(kw)) score += kw.length > 3 ? 2 : 1
    }
    for (const stock of sector.stocks) {
      if (text.includes(stock.n)) score += stock.w * 0.5
    }
    if (score > 0) scores[key] = score
  }

  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([k]) => k as SectorKey)

  const primary  = sorted[0] ?? 'energy'
  const relKeys  = DB[primary]?.ripple.w2.concat(DB[primary]?.ripple.w3 ?? []) ?? []
  const allSectors = [...new Set([primary, ...sorted.slice(1), ...relKeys])] as SectorKey[]

  return { primary, allSectors, scores }
}

// ── بناء موجات التأثير ─────────────────────────────
export function buildRipples(
  primary: SectorKey,
  allSectors: SectorKey[],
  sentiment: SentimentResult,
  wavesCount: '3' | '5' = '3'
) {
  const { dir } = sentiment
  const abs     = Math.abs(sentiment.score)
  const sign    = dir === 'pos' ? 1 : -1
  const nodes: import('@/types').RippleNode[] = []

  const pct = (base: number, mult = 1, flip = false): string => {
    const v = (base * (abs / 80) * mult).toFixed(1)
    return (flip ? -sign : sign) > 0 ? `+${v}%` : `-${v}%`
  }

  const pData  = DB[primary]
  const wCount = parseInt(wavesCount)
  const w2Keys = pData.ripple.w2.slice(0, wCount > 3 ? 3 : 2)
  const w3Keys = pData.ripple.w3.slice(0, wCount > 3 ? 3 : 2)

  // Wave 1
  nodes.push({ label: `الموجة الأولى — ${pData.label}`, wave: 1, isHead: true })
  pData.stocks.slice(0, 3).forEach((s, i) => {
    nodes.push({
      ...s, pct: pct(3.5 - i * 0.4), wave: 1,
      desc: `تأثير مباشر — ${pData.label}`,
      icon: pData.icon, icoClass: 'b', sectorKey: primary, primaryKey: primary,
      pctVal: parseFloat(pct(3.5 - i * 0.4)),
    })
  })

  // Wave 2
  nodes.push({ label: `الموجة الثانية — قطاعات مرتبطة`, wave: 2, isHead: true })
  w2Keys.forEach((sk, i) => {
    const sd   = DB[sk]; if (!sd) return
    const mult = (RELS[primary] as Record<string, number>)?.[sk] ?? 0.6
    sd.stocks.slice(0, 2).forEach((s, j) => {
      const p = pct(2.8 - i * 0.3 - j * 0.2, mult)
      nodes.push({
        ...s, pct: p, wave: 2,
        desc: `${sd.label} — ارتباط قطاعي`,
        icon: sd.icon, icoClass: 'o', sectorKey: sk, primaryKey: primary,
        pctVal: parseFloat(p),
      })
    })
  })

  // Wave 3
  if (wCount >= 3) {
    nodes.push({ label: `الموجة الثالثة — تأثير غير مباشر`, wave: 3, isHead: true })
    w3Keys.forEach((sk, i) => {
      const sd   = DB[sk]; if (!sd) return
      const mult = (RELS[primary] as Record<string, number>)?.[sk] ?? 0.4
      sd.stocks.slice(0, 2).forEach((s, j) => {
        const p = pct(1.8 - i * 0.3 - j * 0.2, mult)
        nodes.push({
          ...s, pct: p, wave: 3,
          desc: `${sd.label} — تأثير بعيد`,
          icon: sd.icon, icoClass: 'g', sectorKey: sk, primaryKey: primary,
          pctVal: parseFloat(p),
        })
      })
    })
  }

  return nodes
}

// ── خط الزمن ──────────────────────────────────────
export function buildTimeline(sentiment: SentimentResult) {
  const sign = sentiment.dir === 'pos' ? 1 : -1
  const abs  = Math.abs(sentiment.score)
  return [
    { l: 'T+0',  v: +(sign * abs * 0.15).toFixed(1), active: true },
    { l: 'T+2h', v: +(sign * abs * 0.30).toFixed(1) },
    { l: 'T+1d', v: +(sign * abs * 0.45).toFixed(1) },
    { l: 'T+3d', v: +(sign * abs * 0.38).toFixed(1) },
    { l: 'T+1w', v: +(sign * abs * 0.25).toFixed(1) },
    { l: 'T+2w', v: +(sign * abs * 0.12).toFixed(1) },
    { l: 'T+1m', v: +(-sign * abs * 0.05).toFixed(1) },
  ]
}
