// ══════════════════════════════════════════════════════════════════
// موجة الخبر — محرك حساب تأثير الأخبار
// المسار: src/lib/news-impact-engine.ts
// الحالة: ملف جديد — لا يوجد في البرنامج الأصلي
// المعادلة: Impact(B) = Base(A) × Ownership% × S × M × T(t) × L
// ══════════════════════════════════════════════════════════════════
 
import {
  OWNERSHIP_RELATIONS,
  NEWS_TYPES,
  STOCK_INFO,
  getRelationsByOwner,
  getNewsType,
  type MarketState,
} from '@/data/network-db'
 
// re-export حتى تستطيع الملفات الأخرى استيراد MarketState من هنا مباشرة
export type { MarketState }
 
// ══════════════════════════════════════════════════════════════════
// أنواع المدخلات والمخرجات
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
  rank:           number
  stockCode:      string
  stockName:      string
  sector:         string
  market:         string
  impactPct:      number
  direction:      'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  relationType:   string
  layer:          number
  ownershipPct:   number | null
  effectiveOwn:   number
  timeframe:      { minHrs: number; maxHrs: number; label: string }
  path:           string[]
  formula:        string
  strength:       number
}
 
export interface NewsClassification {
  type:        string
  name_ar:     string
  suggestedS:  number
  confidence:  number
  direction:   'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  lambda:      number
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
 
const LAYER_DECAY: Record<number, number> = { 1:1.0, 2:0.7, 3:0.5, 4:0.25 }
 
const MARKET_MULTIPLIER: Record<MarketState, number> = {
  RISK_ON:  1.3,
  NEUTRAL:  1.0,
  RISK_OFF: 0.7,
}
 
// ══════════════════════════════════════════════════════════════════
// ١. دالة تصنيف الخبر تلقائياً
// ══════════════════════════════════════════════════════════════════
 
const CLASSIFY_RULES: Array<{
  pattern: RegExp
  type:    string
  s:       number
  dir:     'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
}> = [
  { pattern: /أرباح.{0,20}(فاق|تجاوز|أفضل|ارتفع|نما|قفز|قياسي)/i,    type:'EARNINGS_BEAT',    s:1.8, dir:'POSITIVE' },
  { pattern: /أرباح.{0,20}(دون|تراجع|انخفض|خسارة|هبط|أقل من)/i,      type:'EARNINGS_MISS',    s:1.8, dir:'NEGATIVE' },
  { pattern: /(رفع|زيادة|ارتفاع).{0,10}(الفائدة|سعر الفائدة)/i,        type:'RATE_HIKE',        s:1.3, dir:'POSITIVE' },
  { pattern: /(خفض|تخفيض|تراجع).{0,10}(الفائدة|سعر الفائدة)/i,        type:'RATE_CUT',         s:1.3, dir:'POSITIVE' },
  { pattern: /(ارتفع|صعد|قفز).{0,15}(النفط|برنت|الخام)/i,             type:'OIL_UP',           s:1.5, dir:'POSITIVE' },
  { pattern: /(انخفض|تراجع|هبط).{0,15}(النفط|برنت|الخام)/i,           type:'OIL_DOWN',         s:1.5, dir:'NEGATIVE' },
  { pattern: /(عقد|مشروع|ترسية).{0,20}(مليار|ضخم|رؤية 2030|حكومي)/i,  type:'MAJOR_CONTRACT',   s:2.0, dir:'POSITIVE' },
  { pattern: /أوبك.{0,20}(تخفيض|خفض).{0,15}(إنتاج|إمدادات)/i,        type:'OPEC_CUT',         s:1.3, dir:'POSITIVE' },
  { pattern: /(استحواذ|اندماج|شراء.{0,10}حصة|تملك)/i,                  type:'OWNERSHIP_CHANGE', s:2.5, dir:'POSITIVE' },
  { pattern: /(توزيعات|أرباح نقدية).{0,20}(استثنائي|إضافي)/i,          type:'DIVIDEND',         s:1.2, dir:'POSITIVE' },
  { pattern: /(رفع|تحسين).{0,15}(التوقعات|guidance|الأهداف)/i,         type:'GUIDANCE_UP',      s:1.6, dir:'POSITIVE' },
  { pattern: /(رخصة|موافقة|قرار).{0,15}(هيئة|وزارة|تنظيمي|تشغيل)/i,   type:'REGULATORY',       s:1.4, dir:'POSITIVE' },
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
  return { type:'GENERAL', name_ar:'خبر عام', suggestedS:1.0, confidence:0.3, direction:'NEUTRAL', lambda:1.0 }
}
 
// ══════════════════════════════════════════════════════════════════
// ٢. دالة تقدير الإطار الزمني
// ══════════════════════════════════════════════════════════════════
 
export function estimateTimeframe(layer: number): { minHrs:number; maxHrs:number; label:string } {
  const map: Record<number, { minHrs:number; maxHrs:number; label:string }> = {
    0: { minHrs:0,    maxHrs:0.08, label:'فوري — ثوانٍ'           },
    1: { minHrs:0.08, maxHrs:1,   label:'سريع — دقائق إلى ساعة'  },
    2: { minHrs:1,    maxHrs:6,   label:'متأخر — ساعات'           },
    3: { minHrs:6,    maxHrs:48,  label:'بطيء — يوم إلى يومين'   },
    4: { minHrs:24,   maxHrs:168, label:'معنوي — أيام'            },
  }
  return map[layer] ?? map[4]
}
 
// ══════════════════════════════════════════════════════════════════
// ٣. الدالة الرئيسية — المعادلة الكاملة
// Impact(B) = Base(A) × Ownership% × S × M × T(t) × L
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
    minImpactThreshold = 0.1,
  } = params
 
  // ── تصنيف الخبر ───────────────────────────────────────────────
  const classification = newsText
    ? classifyNews(newsText)
    : { type: params.newsType ?? 'GENERAL', name_ar: NEWS_TYPES[params.newsType ?? 'GENERAL']?.name_ar ?? 'خبر عام', suggestedS:1.0, confidence:0.3, direction:'NEUTRAL' as const, lambda:1.0 }
 
  const newsTypeData = getNewsType(classification.type)
 
  // ── المعاملات ─────────────────────────────────────────────────
  const S      = inputS ?? classification.suggestedS
  const M      = MARKET_MULTIPLIER[marketState]
  const lambda = newsTypeData.lambda
  const T      = Math.exp(-lambda * hoursElapsed)   // T(t) = e^(-λt)
 
  // ── التحذيرات ─────────────────────────────────────────────────
  const warnings: string[] = []
  if (!inputS)             warnings.push('S تم تقديره تلقائياً من نص الخبر')
  if (marketState === 'NEUTRAL') warnings.push('M = 1.0 (محايد) — يُنصح بتحديد حالة السوق')
  if (hoursElapsed === 0)  warnings.push('T = 1.0 (تأثير فوري) — لم تُحدَّد ساعات منذ الخبر')
  if (classification.confidence < 0.5) warnings.push('تصنيف الخبر غير مؤكد — التحقق اليدوي يُنصح به')
 
  // ── السهم الأصلي ──────────────────────────────────────────────
  const originInfo = STOCK_INFO[originStockCode]
  const results: ImpactResult[] = []
  const visited = new Set<string>([originStockCode])
 
  results.push({
    rank:         1,
    stockCode:    originStockCode,
    stockName:    originInfo?.name ?? originStockCode,
    sector:       originInfo?.sector ?? 'غير محدد',
    market:       originInfo?.market ?? 'TASI',
    impactPct:    parseFloat(baseImpact.toFixed(4)),
    direction:    baseImpact > 0 ? 'POSITIVE' : baseImpact < 0 ? 'NEGATIVE' : 'NEUTRAL',
    relationType: 'ORIGIN',
    layer:        0,
    ownershipPct: null,
    effectiveOwn: 1.0,
    timeframe:    estimateTimeframe(0),
    path:         [originStockCode],
    formula:      `${baseImpact}% × 1.0 × S${S} × M${M} × T${T.toFixed(2)} × L${originInfo?.liquidity ?? 1.0}`,
    strength:     10,
  })
 
  // ── BFS — انتشار التأثير عبر شبكة العلاقات ───────────────────
  const queue: Array<{ code:string; cumOwn:number; depth:number; path:string[] }> = [
    { code:originStockCode, cumOwn:1.0, depth:0, path:[originStockCode] },
  ]
 
  while (queue.length > 0) {
    const { code, cumOwn, depth, path } = queue.shift()!
    if (depth >= maxDepth) continue
 
    const relations = getRelationsByOwner(code)
 
    for (const rel of relations) {
      if (visited.has(rel.owned_code)) continue
      visited.add(rel.owned_code)
 
      const ownershipRatio   = rel.ownership_pct > 0 ? rel.ownership_pct / 100 : 0.35
      const effectiveOwn     = cumOwn * ownershipRatio * LAYER_DECAY[rel.layer]
      const stockInfo        = STOCK_INFO[rel.owned_code]
      const L                = stockInfo?.liquidity ?? 1.0
 
      // ══ المعادلة الكاملة ════════════════════════════════════════
      // Impact(B) = Base(A) × Ownership% × S × M × T(t) × L
      const impact = baseImpact * effectiveOwn * S * M * T * L
      // ════════════════════════════════════════════════════════════
 
      if (Math.abs(impact) < minImpactThreshold) continue
 
      const newPath = [...path, rel.owned_code]
 
      results.push({
        rank:         0,
        stockCode:    rel.owned_code,
        stockName:    stockInfo?.name ?? rel.owned_name,
        sector:       stockInfo?.sector ?? rel.owned_sector,
        market:       stockInfo?.market ?? 'TASI',
        impactPct:    parseFloat(impact.toFixed(4)),
        direction:    impact > 0 ? 'POSITIVE' : impact < 0 ? 'NEGATIVE' : 'NEUTRAL',
        relationType: rel.relation_type,
        layer:        rel.layer,
        ownershipPct: rel.ownership_pct > 0 ? rel.ownership_pct : null,
        effectiveOwn: parseFloat(effectiveOwn.toFixed(4)),
        timeframe:    estimateTimeframe(rel.layer),
        path:         newPath,
        formula:      `${baseImpact}% × ${effectiveOwn.toFixed(3)} × S${S} × M${M} × T${T.toFixed(2)} × L${L}`,
        strength:     rel.strength,
      })
 
      if (rel.layer <= 2) {
        queue.push({ code:rel.owned_code, cumOwn:effectiveOwn, depth:depth+1, path:newPath })
      }
    }
  }
 
  // ── الترتيب التنازلي ──────────────────────────────────────────
  results.sort((a, b) => Math.abs(b.impactPct) - Math.abs(a.impactPct))
  results.forEach((r, i) => { r.rank = i + 1 })
 
  return {
    meta: {
      requestId:          `ni-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      timestamp:          new Date().toISOString(),
      originStock:        { code:originStockCode, name:originInfo?.name ?? originStockCode, sector:originInfo?.sector ?? '' },
      baseImpact,
      parameters:         { S, M, T:parseFloat(T.toFixed(4)), marketState },
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
  const base        = calculateNewsImpact({ ...params, surpriseFactor:1.0, marketState:'NEUTRAL'  })
  const optimistic  = calculateNewsImpact({ ...params, surpriseFactor:2.0, marketState:'RISK_ON'  })
  const pessimistic = calculateNewsImpact({ ...params, surpriseFactor:0.5, marketState:'RISK_OFF' })
  return {
    base:       { label:'أساسي',   params:{ S:1.0, M:1.0 }, results:base.impacts.slice(0,10)        },
    optimistic: { label:'تفاؤلي',  params:{ S:2.0, M:1.3 }, results:optimistic.impacts.slice(0,10)  },
    pessimistic:{ label:'تحفظي',   params:{ S:0.5, M:0.7 }, results:pessimistic.impacts.slice(0,10) },
  }
}
