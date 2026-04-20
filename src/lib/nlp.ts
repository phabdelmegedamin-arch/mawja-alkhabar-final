// ══════════════════════════════════════════════════
// موجة الخبر — محرك NLP (TypeScript) — نسخة مُصلَحة
// الإصلاحات:
//  1. إضافة كلمات مفتاحية للتصنيف (مكاسب، تعليق، تصدر...)
//  2. تمييز الحدث الفعلي عن التوقع في التصنيف
//  3. كشف السهم الرئيسي بـ NER مُحسَّن قبل كشف القطاع
//  4. إعطاء السهم المذكور أولوية في الموجة الأولى
//  5. إصلاح الموجة الثالثة (w3Keys كانت تأتي فارغة)
//  6. قيم الموجات متناسبة مع قوة الخبر (لا ثوابت 92 أو 55)
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
  // ── إضافات مفقودة ──
  'تعليق':2.0,'تعلق':2.0,'تجميد':2.0,'ضغط':1.5,'ضغوط':1.5,
  'ينخفض':2.0,'يتراجع':2.0,'يهبط':2.0,
}
 
const POS: Record<string, number> = {
  'ارتفع':2.0,'ارتفعت':2.0,'ارتفاع':1.5,'نما':2.0,'نمو':2.0,'نمت':2.0,
  'زيادة':1.0,'قفز':2.0,'قفزت':2.0,'تحسن':1.5,'تحسنت':1.5,
  'صعد':1.5,'صعدت':1.5,'تجاوز':2.0,'تجاوزت':2.0,
  'توسعة':2.0,'خطط توسع':2.0,'مشروع جديد':1.5,
  'صفقة':1.5,'اتفاقية':1.5,'شراكة':1.5,
  'إطلاق':1.5,'افتتاح':2.0,'تدشين':1.5,
  'خفض الفائدة':2.0,'تحفيز':1.5,'دعم حكومي':1.5,
  'انتعاش':2.0,'ازدهار':2.0,'طفرة':2.0,'نمو اقتصادي':2.0,
  'نجح':1.5,'نجحت':1.5,'استثمارات':1.5,'أرباح':1.0,'ربح':1.0,
  'توزيع أرباح':2.5,'أرباح قياسية':3.0,'نمو الأرباح':2.0,
  'زيادة الأرباح':2.0,'ارتفاع الأرباح':2.0,
  'أعلى مستوى':2.0,'مستوى قياسي':2.0,'رقم قياسي':2.0,
  'نمو قياسي':2.5,'أرباح مرتفعة':2.0,
  // ── إضافات مفقودة ──
  'مكاسب':2.0,'يضيف':1.5,'أضاف':1.5,'يرتفع':2.0,'يصعد':1.5,'يقفز':2.0,
  'تصدر':1.5,'يتصدر':1.5,'الأكثر تداولاً':1.5,
  'يفتتح':1.5,'معرض جديد':1.5,'استثمار':1.5,'توسع':2.0,
  'توقعات إيجابية':2.0,'توقعات نمو':2.0,
  'تحقق ارتفاع':1.5,'يضيف مكاسب':2.0,
}
 
// ── مُعدِّلات التوقع ───────────────────────────────
const FORECAST_MARKERS = [
  'توقع','توقعات','متوقع','يُتوقع','يُرجَّح',
  'قد يرتفع','قد ينخفض','من المحتمل','تقديرات','هدف سعري',
]
 
const NEGATORS = [' لا ', ' لم ', ' لن ', ' ليس ', ' ليست ', ' غير ']
 
function isNegated(text: string, word: string): boolean {
  const idx = text.indexOf(word)
  if (idx < 0) return false
  const before = text.slice(Math.max(0, idx - 22), idx)
  return NEGATORS.some(n => before.includes(n))
}
 
function isForecast(text: string): boolean {
  return FORECAST_MARKERS.some(m => text.includes(m))
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
 
  if (tot < 0.3) {
    return { score:0, dir:'neu', pos_words:[], neg_words:[],
             intensity:'low', top_cat:'general', raw_score:0 }
  }
 
  // خبر توقع → اخفض الثقة 40%
  const forecastFactor = isForecast(text) ? 0.6 : 1.0
 
  let dir: 'pos' | 'neg' | 'neu'
  let score: number
 
  if (diff > 0.15) {
    dir   = 'pos'
    score = Math.min(85, Math.round((25 + (ps / tot) * 60) * forecastFactor))
  } else if (diff < -0.15) {
    dir   = 'neg'
    score = -Math.min(85, Math.round((25 + (ns / tot) * 60) * forecastFactor))
  } else {
    dir   = 'neu'
    score = Math.round(diff * 10 * forecastFactor)
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
 
// ══════════════════════════════════════════════════
// NER: كشف السهم الرئيسي من النص
// ══════════════════════════════════════════════════
 
const STOCK_NER_MAP: Record<string, string> = {
  'تداول':'1111','السوق المالية':'1111','تاسي':'1111',
  'بنك الرياض':'1010','الرياض':'1010',
  'الجزيرة':'1020','بنك الجزيرة':'1020',
  'بنك الاستثمار':'1030','الاستثمار':'1030',
  'بنك البلاد':'1140','البلاد':'1140',
  'الإنماء':'1150','بنك الإنماء':'1050',
  'الراجحي':'1120','مصرف الراجحي':'1120',
  'البنك الأهلي':'1180','الأهلي التجاري':'1180','الأهلي':'1180',
  'البنك العربي':'1080','العربي':'1080',
  'الأول':'1060','البنك الأول':'1060',
  'أرامكو':'2222','أرامكو السعودية':'2222','ارامكو':'2222',
  'المصافي':'2030',
  'بترو رابغ':'2380','بترورابغ':'2380',
  'سابك':'2010',
  'سابك للمغذيات':'2020','المغذيات':'2020',
  'ينساب':'2290',
  'معادن':'1211',
  'اس تي سي':'7010','stc':'7010','STC':'7010',
  'زين السعودية':'7030','زين':'7030',
  'موبايلي':'7020',
  'جرير':'4190','مكتبة جرير':'4190',
  'نايس ون':'4193',
  'إكسترا':'4003',
  'أمريكانا':'6015',
  'المراعي':'2280',
  'صافولا':'2050',
  'الكابلات السعودية':'2110','الكابلات':'2110',
  'مياهنا':'2082',
  'أكوا باور':'2082','أكوا':'2082',
  'مسك':'4082',
  'دار الأركان':'4300',
}
 
export function detectPrimaryStockFromText(text: string): string | null {
  const codeMatch = text.match(/\b(\d{4})\b/)
  if (codeMatch) return codeMatch[1]
 
  const entries = Object.entries(STOCK_NER_MAP).sort((a, b) => b[0].length - a[0].length)
  for (const [name, code] of entries) {
    if (text.includes(name)) return code
  }
  return null
}
 
// ── كشف القطاعات ──────────────────────────────────
export function detectSectors(text: string): SectorDetectResult {
  const scores: Record<string, number> = {}
 
  const detectedCode = detectPrimaryStockFromText(text)
 
  for (const [key, sector] of Object.entries(DB)) {
    let score = 0
 
    for (const kw of sector.kw) {
      if (text.includes(kw)) score += kw.length > 3 ? 2 : 1
    }
 
    for (const stock of sector.stocks) {
      if (text.includes(stock.n)) score += stock.w * 0.5
      // إذا كان الكود المكتشف في هذا القطاع → أولوية قصوى
      if (detectedCode && stock.t === detectedCode) score += 20
    }
 
    if (score > 0) scores[key] = score
  }
 
  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([k]) => k as SectorKey)
 
  const primary  = sorted[0] ?? 'banking'
  const relKeys  = DB[primary]?.ripple.w2.concat(DB[primary]?.ripple.w3 ?? []) ?? []
  const allSectors = Array.from(new Set([primary, ...sorted.slice(1), ...relKeys])) as SectorKey[]
 
  return { primary, allSectors, scores, detectedCode }
}
 
// ── بناء موجات التأثير ─────────────────────────────
export function buildRipples(
  primary: SectorKey,
  allSectors: SectorKey[],
  sentiment: SentimentResult,
  wavesCount: '3' | '5' = '3',
  detectedCode?: string | null,
) {
  const { dir, score } = sentiment
  const abs  = Math.abs(score)
  const sign = dir === 'pos' ? 1 : dir === 'neg' ? -1 : 1
  const nodes: import('@/types').RippleNode[] = []
 
  // نسبة التأثير متناسبة مع قوة الخبر (0.3 – 1.0)
  const powerFactor = Math.max(0.3, abs / 85)
 
  const pct = (base: number, mult = 1, flip = false): string => {
    const raw = base * powerFactor * mult
    const val = raw.toFixed(1)
    return (flip ? -sign : sign) > 0 ? `+${val}%` : `-${val}%`
  }
 
  const pData  = DB[primary]
  if (!pData) return nodes
 
  const wCount = parseInt(wavesCount)
  const w2Keys = pData.ripple.w2.slice(0, wCount > 3 ? 3 : 2)
  const w3Keys = (pData.ripple.w3 ?? []).slice(0, wCount > 3 ? 3 : 2)
 
  // الموجة الأولى
  nodes.push({ label: `الموجة الأولى — ${pData.label}`, wave: 1, isHead: true })
 
  let w1Stocks = [...pData.stocks]
  // السهم المذكور يظهر أولاً
  if (detectedCode) {
    const idx = w1Stocks.findIndex(s => s.t === detectedCode)
    if (idx > 0) {
      const [found] = w1Stocks.splice(idx, 1)
      w1Stocks.unshift(found)
    }
  }
 
  w1Stocks.slice(0, 3).forEach((s, i) => {
    nodes.push({
      ...s, pct: pct(3.5 - i * 0.4), wave: 1,
      desc: `تأثير مباشر — ${pData.label}`,
      icon: pData.icon, icoClass: 'b', sectorKey: primary, primaryKey: primary,
      pctVal: parseFloat(pct(3.5 - i * 0.4)),
    })
  })
 
  // الموجة الثانية
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
 
  // الموجة الثالثة — الإصلاح الرئيسي
  if (wCount >= 3 && w3Keys.length > 0) {
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
  const sign = sentiment.dir === 'pos' ? 1 : sentiment.dir === 'neg' ? -1 : 0
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
 
