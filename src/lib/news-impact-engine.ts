// ══════════════════════════════════════════════════════════════════
// موجة الخبر — محرك حساب تأثير الأخبار
// المسار: src/lib/news-impact-engine.ts
// ══════════════════════════════════════════════════════════════════
 
import {
  OWNERSHIP_RELATIONS,
  NEWS_TYPES,
  STOCK_INFO,
  getRelationsByOwner,
  getNewsType,
  type MarketState,
} from '@/data/network-db'
 
export type { MarketState }
 
// ══════════════════════════════════════════════════════════════════
// أنواع
// ══════════════════════════════════════════════════════════════════
 
export interface NewsImpactParams {
  originStockCode:     string
  baseImpact:          number
  newsText?:           string
  newsType?:           string
  surpriseFactor?:     number
  marketState?:        MarketState
  hoursElapsed?:       number
  maxDepth?:           number
  minImpactThreshold?: number
}
 
export interface ImpactResult {
  rank:            number
  stockCode:       string
  stockName:       string
  sector:          string
  market:          string
  impactPct:       number
  direction:       'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  relationType:    string
  layer:           number
  ownershipPct:    number | null
  effectiveOwn:    number
  timeframe:       { minHrs: number; maxHrs: number; label: string }
  path:            string[]
  formula:         string
  strength:        number
  propagationDir:  'UPWARD' | 'DOWNWARD' | 'ORIGIN'
}
 
export interface NewsClassification {
  type:       string
  name_ar:    string
  suggestedS: number
  confidence: number
  direction:  'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  lambda:     number
}
 
export interface NewsImpactResponse {
  meta: {
    requestId:          string
    timestamp:          string
    originStock:        { code: string; name: string; sector: string }
    baseImpact:         number
    parameters:         { S: number; M: number; T: number; marketState: string }
    newsClassification: NewsClassification
    totalAffected:      number
    processingMs:       number
  }
  impacts:  ImpactResult[]
  warnings: string[]
}
 
// ══════════════════════════════════════════════════════════════════
// الثوابت
// ══════════════════════════════════════════════════════════════════
 
const LAYER_DECAY_UP: Record<number, number>   = { 1: 1.0, 2: 0.70, 3: 0.50, 4: 0.25 }
const LAYER_DECAY_DOWN: Record<number, number> = { 1: 0.4, 2: 0.25, 3: 0.15, 4: 0.08 }
 
const MARKET_MULTIPLIER: Record<MarketState, number> = {
  RISK_ON:  1.3,
  NEUTRAL:  1.0,
  RISK_OFF: 0.7,
}
 
function getRelationsByOwned(ownedCode: string) {
  return OWNERSHIP_RELATIONS.filter(r => r.owned_code === ownedCode)
}
 
// ══════════════════════════════════════════════════════════════════
// ١. تصنيف الخبر
// ══════════════════════════════════════════════════════════════════
 
const CLASSIFY_RULES: Array<{
  pattern: RegExp
  type:    string
  s:       number
  dir:     'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
}> = [
  { pattern: /أرباح.{0,20}(فاق|تجاوز|أفضل|ارتفع|نما|قفز|قياسي)/i,    type: 'EARNINGS_BEAT',    s: 1.8, dir: 'POSITIVE' },
  { pattern: /أرباح.{0,20}(دون|تراجع|انخفض|خسارة|هبط|أقل من)/i,      type: 'EARNINGS_MISS',    s: 1.8, dir: 'NEGATIVE' },
  { pattern: /خسارة.{0,30}(مليار|مليون|صافية|فادحة)/i,                 type: 'EARNINGS_MISS',    s: 2.0, dir: 'NEGATIVE' },
  { pattern: /تخسر.{0,30}(مليار|مليون)/i,                              type: 'EARNINGS_MISS',    s: 2.0, dir: 'NEGATIVE' },
  { pattern: /(رفع|زيادة|ارتفاع).{0,10}(الفائدة|سعر الفائدة)/i,        type: 'RATE_HIKE',        s: 1.3, dir: 'POSITIVE' },
  { pattern: /(خفض|تخفيض|تراجع).{0,10}(الفائدة|سعر الفائدة)/i,        type: 'RATE_CUT',         s: 1.3, dir: 'POSITIVE' },
  { pattern: /(ارتفع|صعد|قفز).{0,15}(النفط|برنت|الخام)/i,             type: 'OIL_UP',           s: 1.5, dir: 'POSITIVE' },
  { pattern: /(انخفض|تراجع|هبط).{0,15}(النفط|برنت|الخام)/i,           type: 'OIL_DOWN',         s: 1.5, dir: 'NEGATIVE' },
  { pattern: /(عقد|مشروع|ترسية).{0,20}(مليار|ضخم|رؤية 2030|حكومي)/i,  type: 'MAJOR_CONTRACT',   s: 2.0, dir: 'POSITIVE' },
  { pattern: /أوبك.{0,20}(تخفيض|خفض).{0,15}(إنتاج|إمدادات)/i,        type: 'OPEC_CUT',         s: 1.3, dir: 'POSITIVE' },
  { pattern: /(استحواذ|اندماج|شراء.{0,10}حصة|تملك)/i,                  type: 'OWNERSHIP_CHANGE', s: 2.5, dir: 'POSITIVE' },
  { pattern: /(توزيعات|أرباح نقدية).{0,20}(استثنائي|إضافي)/i,          type: 'DIVIDEND',         s: 1.2, dir: 'POSITIVE' },
  { pattern: /(رفع|تحسين).{0,15}(التوقعات|guidance|الأهداف)/i,         type: 'GUIDANCE_UP',      s: 1.6, dir: 'POSITIVE' },
  { pattern: /(رخصة|موافقة|قرار).{0,15}(هيئة|وزارة|تنظيمي|تشغيل)/i,   type: 'REGULATORY',       s: 1.4, dir: 'POSITIVE' },
  { pattern: /(تراجع|انخفض|هبط|تدهور).{0,20}(أرباح|إيرادات|مبيعات)/i, type: 'EARNINGS_MISS',    s: 1.6, dir: 'NEGATIVE' },
  { pattern: /(إفلاس|تعثر|إعسار|توقف عن السداد)/i,                      type: 'EARNINGS_MISS',    s: 2.5, dir: 'NEGATIVE' },
  { pattern: /(غرامة|عقوبة|تشديد تنظيمي).{0,20}(مليار|مليون)/i,        type: 'REGULATORY',       s: 1.8, dir: 'NEGATIVE' },
  // ── قواعد مفقودة (إصلاح) ──────────────────────────────────────────
  // تعليق/تجميد الأسهم → سلبي تنظيمي
  { pattern: /(تعليق|تعلق|تجميد|إيقاف).{0,20}(أسهم|تداول|تداولات)/i,   type: 'REGULATORY',       s: 1.5, dir: 'NEGATIVE' },
  // انخفاض صريح بنسبة مئوية
  { pattern: /(ينخفض|يتراجع|يهبط|انخفض|تراجع).{0,10}(\d+\.?\d*%)/i,   type: 'EARNINGS_MISS',    s: 1.6, dir: 'NEGATIVE' },
  // ارتفاع صريح بنسبة مئوية
  { pattern: /(يرتفع|يصعد|ارتفع|يضيف|يقفز).{0,10}(\d+\.?\d*%)/i,      type: 'EARNINGS_BEAT',    s: 1.5, dir: 'POSITIVE' },
  // تصدر قائمة الرابحين / الأكثر تداولاً
  { pattern: /(يتصدر|تصدر).{0,20}(رابحين|الأكثر تداولاً|قائمة)/i,      type: 'GUIDANCE_UP',      s: 1.2, dir: 'POSITIVE' },
  // مكاسب للقطاعات / السوق
  { pattern: /مكاسب.{0,20}(قطاع|سوق|تداول|طاقة|مرافق|بنوك)/i,         type: 'EARNINGS_BEAT',    s: 1.4, dir: 'POSITIVE' },
  // افتتاح معرض / فرع / مشروع = توسع إيجابي
  { pattern: /(يفتتح|تفتتح|افتتاح).{0,20}(معرض|فرع|مشروع|مقر)/i,      type: 'MAJOR_CONTRACT',   s: 1.3, dir: 'POSITIVE' },
  // توقعات أرباح إيجابية
  { pattern: /توقعات.{0,20}(أرباح|نمو|ارتفاع).{0,20}(\d+\.?\d*%)/i,   type: 'GUIDANCE_UP',      s: 1.4, dir: 'POSITIVE' },
  // القيمة السوقية تنخفض
  { pattern: /(تراجع|انخفض|هبط).{0,20}(القيمة السوقية|الرسملة)/i,      type: 'EARNINGS_MISS',    s: 1.5, dir: 'NEGATIVE' },
]
 
export function classifyNews(newsText: string): NewsClassification {
  for (const rule of CLASSIFY_RULES) {
    if (rule.pattern.test(newsText)) {
      const nt = NEWS_TYPES[rule.type]
      return {
        type:       rule.type,
        name_ar:    nt?.name_ar ?? rule.type,
        suggestedS: rule.s,
        confidence: 0.8,
        direction:  rule.dir,
        lambda:     nt?.lambda ?? 1.0,
      }
    }
  }
  return { type: 'GENERAL', name_ar: 'خبر عام', suggestedS: 1.0, confidence: 0.3, direction: 'NEUTRAL', lambda: 1.0 }
}
 
// ══════════════════════════════════════════════════════════════════
// ٢. الإطار الزمني
// ══════════════════════════════════════════════════════════════════
 
export function estimateTimeframe(
  layer: number,
  dir: 'UPWARD' | 'DOWNWARD' | 'ORIGIN' = 'UPWARD'
): { minHrs: number; maxHrs: number; label: string } {
  const map = {
    UPWARD: {
      0: { minHrs: 0,    maxHrs: 0.08, label: 'فوري — ثوانٍ'          },
      1: { minHrs: 0.08, maxHrs: 1,    label: 'سريع — دقائق إلى ساعة' },
      2: { minHrs: 1,    maxHrs: 6,    label: 'متأخر — ساعات'          },
      3: { minHrs: 6,    maxHrs: 24,   label: 'بطيء — يوم'             },
      4: { minHrs: 24,   maxHrs: 72,   label: 'معنوي — أيام'           },
    },
    DOWNWARD: {
      0: { minHrs: 0,  maxHrs: 0.08, label: 'فوري — ثوانٍ'  },
      1: { minHrs: 1,  maxHrs: 6,    label: 'متأخر — ساعات' },
      2: { minHrs: 6,  maxHrs: 48,   label: 'بطيء — يومان'  },
      3: { minHrs: 24, maxHrs: 120,  label: 'معنوي — أيام'  },
      4: { minHrs: 72, maxHrs: 168,  label: 'بطيء — أسبوع'  },
    },
    ORIGIN: {
      0: { minHrs: 0, maxHrs: 0.08, label: 'فوري — ثوانٍ' },
    },
  }
  const dirMap = map[dir] as Record<number, { minHrs: number; maxHrs: number; label: string }>
  return dirMap[layer] ?? dirMap[Math.min(layer, 4)] ?? { minHrs: 24, maxHrs: 168, label: 'معنوي' }
}
 
// ══════════════════════════════════════════════════════════════════
// ٣. الدالة الرئيسية
// ══════════════════════════════════════════════════════════════════
 
export function calculateNewsImpact(params: NewsImpactParams): NewsImpactResponse {
  const startTime = Date.now()
 
  const {
    originStockCode,
    baseImpact,
    newsText           = '',
    surpriseFactor:    inputS,
    marketState        = 'NEUTRAL',
    hoursElapsed       = 0,
    maxDepth           = 3,
    minImpactThreshold = 0.05,
  } = params
 
  // ── تصنيف الخبر ───────────────────────────────────────────────
  const classification = newsText
    ? classifyNews(newsText)
    : {
        type:       params.newsType ?? 'GENERAL',
        name_ar:    NEWS_TYPES[params.newsType ?? 'GENERAL']?.name_ar ?? 'خبر عام',
        suggestedS: 1.0,
        confidence: 0.3,
        direction:  'NEUTRAL' as const,
        lambda:     1.0,
      }
 
  const newsTypeData = getNewsType(classification.type)
  const S      = inputS ?? classification.suggestedS
  const M      = MARKET_MULTIPLIER[marketState]
  const lambda = newsTypeData.lambda
  const T      = Math.exp(-lambda * hoursElapsed)
 
  // ── تصحيح إشارة baseImpact ────────────────────────────────────
  let effectiveBase = baseImpact
  if (classification.direction === 'NEGATIVE' && baseImpact > 0) {
    effectiveBase = -Math.abs(baseImpact)
  } else if (classification.direction === 'POSITIVE' && baseImpact < 0) {
    effectiveBase = Math.abs(baseImpact)
  }
 
  // ── التحذيرات ─────────────────────────────────────────────────
  const warnings: string[] = []
  if (!inputS)                         warnings.push('S تم تقديره تلقائياً من نص الخبر')
  if (marketState === 'NEUTRAL')       warnings.push('M = 1.0 (محايد) — يُنصح بتحديد حالة السوق')
  if (hoursElapsed === 0)              warnings.push('T = 1.0 (تأثير فوري)')
  if (classification.confidence < 0.5) warnings.push('تصنيف الخبر غير مؤكد')
  if (effectiveBase !== baseImpact)    warnings.push(`تم تعديل إشارة التأثير (${classification.direction})`)
 
  // ── السهم الأصلي ──────────────────────────────────────────────
  const originInfo = STOCK_INFO[originStockCode]
  const results: ImpactResult[] = []
  const visited = new Set<string>([originStockCode])
 
  results.push({
    rank:           1,
    stockCode:      originStockCode,
    stockName:      originInfo?.name ?? originStockCode,
    sector:         originInfo?.sector ?? 'غير محدد',
    market:         originInfo?.market ?? 'TASI',
    impactPct:      parseFloat(effectiveBase.toFixed(4)),
    direction:      effectiveBase > 0 ? 'POSITIVE' : effectiveBase < 0 ? 'NEGATIVE' : 'NEUTRAL',
    relationType:   'ORIGIN',
    layer:          0,
    ownershipPct:   null,
    effectiveOwn:   1.0,
    timeframe:      estimateTimeframe(0, 'ORIGIN'),
    path:           [originStockCode],
    formula:        `${effectiveBase}%`,
    strength:       10,
    propagationDir: 'ORIGIN',
  })
 
  // ══════════════════════════════════════════════════════════════
  // UPWARD BFS: المملوك → المالك
  // ══════════════════════════════════════════════════════════════
 
  const upQueue: Array<{ code: string; cumOwn: number; depth: number; path: string[] }> = [
    { code: originStockCode, cumOwn: 1.0, depth: 0, path: [originStockCode] },
  ]
  const visitedUp = new Set<string>([originStockCode])
 
  while (upQueue.length > 0) {
    const { code, cumOwn, depth, path } = upQueue.shift()!
    if (depth >= maxDepth) continue
 
    const ownerRelations = getRelationsByOwned(code)
 
    for (const rel of ownerRelations) {
      const ownerCode = rel.owner_code
 
      if (!STOCK_INFO[ownerCode]) continue
      if (visited.has(ownerCode)) continue
      if (visitedUp.has(ownerCode)) continue
 
      visited.add(ownerCode)
      visitedUp.add(ownerCode)
 
      const ownershipRatio = rel.ownership_pct > 0 ? rel.ownership_pct / 100 : 0.35
      const ownershipChain = cumOwn * ownershipRatio
      const layerDecay     = LAYER_DECAY_UP[rel.layer] ?? 0.25
      const ownerInfo      = STOCK_INFO[ownerCode]
      const L              = ownerInfo?.liquidity ?? 1.0
      const impact         = effectiveBase * ownershipChain * layerDecay * S * M * T * L
 
      if (Math.abs(impact) < minImpactThreshold) continue
 
      const newPath = [...path, ownerCode]
 
      results.push({
        rank:           0,
        stockCode:      ownerCode,
        stockName:      ownerInfo?.name ?? rel.owner_name,
        sector:         ownerInfo?.sector ?? rel.owner_sector,
        market:         ownerInfo?.market ?? 'TASI',
        impactPct:      parseFloat(impact.toFixed(4)),
        direction:      impact > 0 ? 'POSITIVE' : impact < 0 ? 'NEGATIVE' : 'NEUTRAL',
        relationType:   rel.relation_type,
        layer:          rel.layer,
        ownershipPct:   rel.ownership_pct > 0 ? rel.ownership_pct : null,
        effectiveOwn:   parseFloat(ownershipChain.toFixed(4)),
        timeframe:      estimateTimeframe(rel.layer, 'UPWARD'),
        path:           newPath,
        formula:        `${effectiveBase}%×${ownershipChain.toFixed(3)}×${layerDecay}(↑)×S${S}×M${M}×T${T.toFixed(2)}×L${L}`,
        strength:       rel.strength,
        propagationDir: 'UPWARD',
      })
 
      if (rel.layer <= 2) {
        upQueue.push({ code: ownerCode, cumOwn: ownershipChain, depth: depth + 1, path: newPath })
      }
    }
  }
 
  // ══════════════════════════════════════════════════════════════
  // DOWNWARD BFS: المالك → المملوك
  // ══════════════════════════════════════════════════════════════
 
  const downQueue: Array<{ code: string; cumOwn: number; depth: number; path: string[] }> = [
    { code: originStockCode, cumOwn: 1.0, depth: 0, path: [originStockCode] },
  ]
  const visitedDown = new Set<string>([originStockCode])
 
  while (downQueue.length > 0) {
    const { code, cumOwn, depth, path } = downQueue.shift()!
    if (depth >= maxDepth) continue
 
    const ownedRelations = getRelationsByOwner(code)
 
    for (const rel of ownedRelations) {
      const ownedCode = rel.owned_code
 
      if (visited.has(ownedCode)) continue
      if (visitedDown.has(ownedCode)) continue
 
      visited.add(ownedCode)
      visitedDown.add(ownedCode)
 
      const ownershipRatio = rel.ownership_pct > 0 ? rel.ownership_pct / 100 : 0.35
      const ownershipChain = cumOwn * ownershipRatio
      const layerDecay     = LAYER_DECAY_DOWN[rel.layer] ?? 0.08
      const ownedInfo      = STOCK_INFO[ownedCode]
      const L              = ownedInfo?.liquidity ?? 1.0
      const impact         = effectiveBase * ownershipChain * layerDecay * S * M * T * L
 
      if (Math.abs(impact) < minImpactThreshold) continue
 
      const newPath = [...path, ownedCode]
 
      results.push({
        rank:           0,
        stockCode:      ownedCode,
        stockName:      ownedInfo?.name ?? rel.owned_name,
        sector:         ownedInfo?.sector ?? rel.owned_sector,
        market:         ownedInfo?.market ?? 'TASI',
        impactPct:      parseFloat(impact.toFixed(4)),
        direction:      impact > 0 ? 'POSITIVE' : impact < 0 ? 'NEGATIVE' : 'NEUTRAL',
        relationType:   rel.relation_type,
        layer:          rel.layer,
        ownershipPct:   rel.ownership_pct > 0 ? rel.ownership_pct : null,
        effectiveOwn:   parseFloat(ownershipChain.toFixed(4)),
        timeframe:      estimateTimeframe(rel.layer, 'DOWNWARD'),
        path:           newPath,
        formula:        `${effectiveBase}%×${ownershipChain.toFixed(3)}×${layerDecay}(↓)×S${S}×M${M}×T${T.toFixed(2)}×L${L}`,
        strength:       rel.strength,
        propagationDir: 'DOWNWARD',
      })
 
      if (rel.layer <= 2) {
        downQueue.push({ code: ownedCode, cumOwn: ownershipChain, depth: depth + 1, path: newPath })
      }
    }
  }
 
  // ══════════════════════════════════════════════════════════════
  // الترتيب:
  // ORIGIN أولاً ← ثم حسب الطبقة (موجة 1 ← 2 ← 3) ← ثم قوة التأثير
  // ══════════════════════════════════════════════════════════════
  results.sort((a, b) => {
    if (a.propagationDir === 'ORIGIN') return -1
    if (b.propagationDir === 'ORIGIN') return  1
    if (a.layer !== b.layer) return a.layer - b.layer
    return Math.abs(b.impactPct) - Math.abs(a.impactPct)
  })
  results.forEach((r, i) => { r.rank = i + 1 })
 
  return {
    meta: {
      requestId:          `ni-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp:          new Date().toISOString(),
      originStock:        { code: originStockCode, name: originInfo?.name ?? originStockCode, sector: originInfo?.sector ?? '' },
      baseImpact:         effectiveBase,
      parameters:         { S, M, T: parseFloat(T.toFixed(4)), marketState },
      newsClassification: classification,
      totalAffected:      results.length,
      processingMs:       Date.now() - startTime,
    },
    impacts:  results,
    warnings,
  }
}
 
// ══════════════════════════════════════════════════════════════════
// ٤. مقارنة ثلاثة سيناريوهات
// ══════════════════════════════════════════════════════════════════
 
export function compareScenarios(params: NewsImpactParams) {
  const base        = calculateNewsImpact({ ...params, surpriseFactor: 1.0, marketState: 'NEUTRAL'  })
  const optimistic  = calculateNewsImpact({ ...params, surpriseFactor: 2.0, marketState: 'RISK_ON'  })
  const pessimistic = calculateNewsImpact({ ...params, surpriseFactor: 0.5, marketState: 'RISK_OFF' })
  return {
    base:        { label: 'أساسي',  params: { S: 1.0, M: 1.0 }, results: base.impacts.slice(0, 10)        },
    optimistic:  { label: 'تفاؤلي', params: { S: 2.0, M: 1.3 }, results: optimistic.impacts.slice(0, 10)  },
    pessimistic: { label: 'تحفظي',  params: { S: 0.5, M: 0.7 }, results: pessimistic.impacts.slice(0, 10) },
  }
}
 
// ══════════════════════════════════════════════════════════════════
// ٥. كشف رمز السهم من النص
// ══════════════════════════════════════════════════════════════════
 
export function extractOriginStockFromText(text: string): string | null {
  const codeMatch = text.match(/\b(\d{4})\b/)
  if (codeMatch && STOCK_INFO[codeMatch[1]]) return codeMatch[1]
 
  const sorted = Object.entries(STOCK_INFO).sort((a, b) => b[1].name.length - a[1].name.length)
  for (const [code, info] of sorted) {
    if (text.includes(info.name)) return code
  }
 
  const KEYWORDS: Record<string, string> = {
    // ── سوق المال ──
    'مجموعة تداول':'1111','السوق المالية':'1111','تداول':'1111','تاسي':'1111',
    // ── بنوك ──
    'مصرف الراجحي':'1120','الراجحي':'1120','rajhi':'1120',
    'البنك الأهلي التجاري':'1180','البنك الأهلي':'1180','الأهلي':'1180','snb':'1180',
    'بنك الإنماء':'1150','الإنماء':'1150',
    'بنك البلاد':'1140','البلاد':'1140',
    'بنك الجزيرة':'1020','الجزيرة':'1020',
    'بنك الاستثمار':'1030','الاستثمار':'1030',
    'بنك الرياض':'1010','الرياض':'1010',
    'البنك العربي':'1080','العربي':'1080',
    'البنك الأول':'1060','الأول':'1060',
    'البنك السعودي الفرنسي':'1050','ساب':'1050','بي اس اف':'1050',
    // ── طاقة ──
    'أرامكو السعودية':'2222','أرامكو':'2222','ارامكو':'2222','aramco':'2222',
    'المصافي':'2030','ساف':'2030',
    'بترو رابغ':'2380','بترورابغ':'2380',
    'الحفر العربية':'2381',
    'البحري':'4030',
    // ── مواد أساسية ──
    'سابك للمغذيات الزراعية':'2020','سابك للمغذيات':'2020',
    'سابك':'2010','sabic':'2010',
    'ينساب':'2290','yansab':'2290',
    'كيان السعودية':'2350','كيان':'2350',
    'سبكيم العالمية':'2310','سبكيم':'2310',
    'الكيميائية السعودية':'2230','الكيميائية':'2230',
    'المتقدمة':'2330',
    'لوبريف':'2223','luberef':'2223',
    'معادن':'1211','maaden':'1211',
    'الكابلات السعودية':'2110','الكابلات':'2110',
    // ── اتصالات ──
    'الاتصالات السعودية':'7010','اس تي سي':'7010','stc':'7010','STC':'7010',
    'موبايلي':'7020',
    'زين السعودية':'7030','زين':'7030',
    // ── تقنية ──
    'علم':'7203','سلوشنز':'7202',
    // ── غذاء ──
    'مجموعة صافولا':'2050','صافولا':'2050','savola':'2050',
    'المراعي':'2280','almarai':'2280',
    'تنمية':'2281',
    'أمريكانا':'6015',
    // ── صحة ──
    'سليمان الحبيب':'4013','دله الصحية':'4004',
    // ── تجزئة ──
    'مكتبة جرير':'4190','جرير':'4190',
    'نايس ون':'4193',
    'إكسترا':'4003',
    'السيف غاليري':'4192','السيف':'4192',
    'النهدي':'4164',
    // ── مرافق ──
    'أكوا باور':'2082','أكوا':'2082','acwa':'2082',
    'مياهنا':'2084',
    'مرافق':'2083',
    // ── نقل ──
    'سابتكو':'4040','طيران ناس':'4264',
    // ── عقارات ──
    'دار الأركان':'4300',
    'جبل عمر':'4250',
    'رتال':'4322',
    // ── خدمات مالية ──
    'سناد':'4080','أملاك':'1182',
    // ── تأمين ──
    'التعاونية للتأمين':'8010','التعاونية':'8010',
    'بوبا العربية':'8210','بوبا':'8210',
  }
  const lower = text.toLowerCase()
  for (const [kw, code] of Object.entries(KEYWORDS)) {
    if (lower.includes(kw.toLowerCase())) return code
  }
 
  return null
}
 
