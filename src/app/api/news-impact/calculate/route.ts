// ══════════════════════════════════════════════════════════════════
// المسار: src/app/api/news-impact/calculate/route.ts
// الإصلاح: تصحيح خطأ تضاعف LAYER_DECAY + مزامنة مع news-impact-engine
// المعادلة: Impact(B) = Base(A) × OwnershipChain × LayerDecay × S × M × T(t) × L
// ══════════════════════════════════════════════════════════════════
 
import { NextRequest, NextResponse } from 'next/server'
import {
  classifyNews,
  extractOriginStockFromText,
} from '@/lib/news-impact-engine'
import { loadRelations, loadNewsTypes, loadStockInfo } from '@/lib/network-loader'
import type { MarketState } from '@/data/network-db'
import type { NewsImpactParams } from '@/lib/news-impact-engine'
 
// ════════════════════════════════════════════════════════
// الثوابت — مطابقة لـ news-impact-engine.ts
// ════════════════════════════════════════════════════════
 
// ✅ الإصلاح: LayerDecay يُطبَّق مرة واحدة فقط في حساب impact
// ولا يتراكم في cumOwn عند التنقل عبر BFS
const LAYER_DECAY: Record<number, number> = { 1: 1.0, 2: 0.70, 3: 0.50, 4: 0.25 }
const MKT_MULT: Record<string, number>    = { RISK_ON:1.3, NEUTRAL:1.0, RISK_OFF:0.7 }
 
// ════════════════════════════════════════════════════════
// محرك الحساب المُحدَّث — يستخدم بيانات Supabase
// ════════════════════════════════════════════════════════
 
async function calculateWithSupabase(params: NewsImpactParams) {
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
 
  const startTime = Date.now()
 
  // ── تحميل البيانات من Supabase ───────────────────────────────
  const [relations, newsTypes] = await Promise.all([
    loadRelations(),
    loadNewsTypes(),
  ])
 
  // ── تصنيف الخبر ─────────────────────────────────────────────
  const classification = newsText
    ? classifyNews(newsText)
    : {
        type:       params.newsType ?? 'GENERAL',
        name_ar:    newsTypes[params.newsType ?? 'GENERAL']?.name_ar ?? 'خبر عام',
        suggestedS: 1.0,
        confidence: 0.3,
        direction:  'NEUTRAL' as const,
        lambda:     1.0,
      }
 
  const newsTypeData = newsTypes[classification.type] ?? newsTypes['GENERAL']
  const S      = inputS ?? classification.suggestedS
  const M      = MKT_MULT[marketState] ?? 1.0
  const lambda = newsTypeData?.lambda ?? 1.0
  const T      = Math.exp(-lambda * hoursElapsed)   // T(t) = e^(-λt)
 
  // ✅ الإصلاح: تصحيح الإشارة بناءً على اتجاه الخبر
  let effectiveBase = baseImpact
  if (classification.direction === 'NEGATIVE' && baseImpact > 0) {
    effectiveBase = -Math.abs(baseImpact)
  } else if (classification.direction === 'POSITIVE' && baseImpact < 0) {
    effectiveBase = Math.abs(baseImpact)
  }
 
  const warnings: string[] = []
  if (!inputS)              warnings.push('S تم تقديره تلقائياً من نص الخبر')
  if (marketState === 'NEUTRAL') warnings.push('M = 1.0 (محايد)')
  if (hoursElapsed === 0)   warnings.push('T = 1.0 (تأثير فوري)')
  if (classification.confidence < 0.5) warnings.push('تصنيف الخبر غير مؤكد')
  if (effectiveBase !== baseImpact) warnings.push(`تم تعديل إشارة التأثير (${classification.direction})`)
 
  // ── السهم الأصلي ────────────────────────────────────────────
  const originInfo = await loadStockInfo(originStockCode)
  const results: any[] = []
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
    timeframeLabel: 'فوري — ثوانٍ',
    path:           [originStockCode],
    formula:        `${effectiveBase}% × 1.0 × S${S} × M${M} × T${T.toFixed(2)} × L${originInfo?.liquidity ?? 1.0}`,
    strength:       10,
  })
 
  // ── BFS عبر شبكة العلاقات ───────────────────────────────────
  // ✅ الإصلاح: cumOwn يحمل فقط الملكية المتراكمة (بدون decay)
  const queue: Array<{ code:string; cumOwn:number; depth:number; path:string[] }> = [
    { code:originStockCode, cumOwn:1.0, depth:0, path:[originStockCode] },
  ]
 
  while (queue.length > 0) {
    const { code, cumOwn, depth, path } = queue.shift()!
    if (depth >= maxDepth) continue
 
    const rels = relations.filter(r => r.owner_code === code)
 
    for (const rel of rels) {
      if (visited.has(rel.owned_code)) continue
      visited.add(rel.owned_code)
 
      const ownershipRatio = rel.ownership_pct > 0 ? rel.ownership_pct / 100 : 0.35
 
      // ✅ الإصلاح الجوهري:
      // ownershipChain = تراكم الملكية فقط (بدون decay)
      // layerDecay     = يُطبَّق مرة واحدة في حساب impact
      const ownershipChain = cumOwn * ownershipRatio
      const layerDecay     = LAYER_DECAY[rel.layer] ?? 0.25
 
      const stockInfo = await loadStockInfo(rel.owned_code)
      const L         = stockInfo?.liquidity ?? 1.0
 
      // ══ المعادلة الكاملة المُصلَحة ════════════════════════════
      // Impact(B) = Base(A) × OwnershipChain × LayerDecay × S × M × T(t) × L
      const impact = effectiveBase * ownershipChain * layerDecay * S * M * T * L
      // ══════════════════════════════════════════════════════════
 
      if (Math.abs(impact) < minImpactThreshold) continue
 
      const timeMap: Record<number, string> = {
        0:'فوري', 1:'دقائق - ساعة', 2:'ساعات', 3:'يوم-يومين', 4:'أيام',
      }
      const newPath = [...path, rel.owned_code]
 
      results.push({
        rank:           0,
        stockCode:      rel.owned_code,
        stockName:      stockInfo?.name ?? rel.owned_name,
        sector:         stockInfo?.sector ?? rel.owned_sector,
        market:         stockInfo?.market ?? 'TASI',
        impactPct:      parseFloat(impact.toFixed(4)),
        direction:      impact > 0 ? 'POSITIVE' : impact < 0 ? 'NEGATIVE' : 'NEUTRAL',
        relationType:   rel.relation_type,
        layer:          rel.layer,
        ownershipPct:   rel.ownership_pct > 0 ? rel.ownership_pct : null,
        effectiveOwn:   parseFloat(ownershipChain.toFixed(4)),
        timeframeLabel: timeMap[rel.layer] ?? 'أيام',
        path:           newPath,
        formula:        `${effectiveBase}%×${ownershipChain.toFixed(3)}×${layerDecay}×S${S}×M${M}×T${T.toFixed(2)}×L${L}`,
        strength:       rel.strength,
      })
 
      // ✅ الإصلاح: نمرر ownershipChain (بدون decay) للطبقة التالية
      if (rel.layer <= 2) {
        queue.push({ code:rel.owned_code, cumOwn:ownershipChain, depth:depth+1, path:newPath })
      }
    }
  }
 
  results.sort((a, b) => Math.abs(b.impactPct) - Math.abs(a.impactPct))
  results.forEach((r, i) => { r.rank = i+1 })
 
  return {
    meta: {
      requestId:          `ni-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      timestamp:          new Date().toISOString(),
      originStock:        { code:originStockCode, name:originInfo?.name ?? originStockCode, sector:originInfo?.sector ?? '' },
      baseImpact:         effectiveBase,
      parameters:         { S, M, T:parseFloat(T.toFixed(4)), marketState },
      newsClassification: classification,
      totalAffected:      results.length,
      processingMs:       Date.now() - startTime,
      dataSource:         'supabase',
    },
    impacts:  results,
    warnings,
  }
}
 
// ── POST /api/news-impact/calculate ──────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
 
    if (!body.originStockCode)
      return NextResponse.json({ success:false, error:'originStockCode مطلوب' }, { status:400 })
    if (body.baseImpact === undefined || body.baseImpact === null)
      return NextResponse.json({ success:false, error:'baseImpact مطلوب' }, { status:400 })
    if (Math.abs(parseFloat(body.baseImpact)) > 50)
      return NextResponse.json({ success:false, error:'baseImpact خارج النطاق (-50 إلى +50)' }, { status:400 })
 
    // إذا لم يُرسَل originStockCode بشكل مباشر، حاول كشفه من النص
    let originStockCode = String(body.originStockCode).trim()
    if (!originStockCode && body.newsText) {
      const detected = extractOriginStockFromText(body.newsText)
      if (detected) originStockCode = detected
    }
    if (!originStockCode) {
      return NextResponse.json({ success:false, error:'لم يتم كشف سهم في الخبر' }, { status:400 })
    }
 
    const params: NewsImpactParams = {
      originStockCode,
      baseImpact:         parseFloat(body.baseImpact),
      newsText:           body.newsText ?? '',
      newsType:           body.newsType,
      surpriseFactor:     body.surpriseFactor     !== undefined ? parseFloat(body.surpriseFactor)     : undefined,
      marketState:        (['RISK_ON','NEUTRAL','RISK_OFF'].includes(body.marketState)
                            ? body.marketState : 'NEUTRAL') as MarketState,
      hoursElapsed:       body.hoursElapsed       !== undefined ? parseFloat(body.hoursElapsed)        : 0,
      maxDepth:           body.maxDepth           !== undefined ? parseInt(body.maxDepth)              : 3,
      minImpactThreshold: body.minImpactThreshold !== undefined ? parseFloat(body.minImpactThreshold)  : 0.05,
    }
 
    if (body.mode === 'compare') {
      const [base, optimistic, pessimistic] = await Promise.all([
        calculateWithSupabase({ ...params, surpriseFactor:1.0, marketState:'NEUTRAL'  }),
        calculateWithSupabase({ ...params, surpriseFactor:2.0, marketState:'RISK_ON'  }),
        calculateWithSupabase({ ...params, surpriseFactor:0.5, marketState:'RISK_OFF' }),
      ])
      return NextResponse.json({
        success: true, mode:'compare',
        data: {
          base:        { label:'أساسي',   params:{S:1.0,M:1.0}, results:base.impacts.slice(0,10)        },
          optimistic:  { label:'تفاؤلي',  params:{S:2.0,M:1.3}, results:optimistic.impacts.slice(0,10)  },
          pessimistic: { label:'تحفظي',   params:{S:0.5,M:0.7}, results:pessimistic.impacts.slice(0,10) },
        },
      })
    }
 
    const result = await calculateWithSupabase(params)
    return NextResponse.json({ success:true, mode:'single', data:result })
 
  } catch (err: any) {
    console.error('[/api/news-impact/calculate]', err)
    return NextResponse.json(
      { success:false, error:'خطأ في معالجة الطلب', details:err?.message },
      { status:500 }
    )
  }
}
 
export async function GET() {
  return NextResponse.json({
    endpoint:    '/api/news-impact/calculate',
    method:      'POST',
    version:     '3.0 (Fixed)',
    description: 'حساب تأثير خبر — Impact(B) = Base(A) × OwnershipChain × LayerDecay × S × M × T(t) × L',
    fix:         'إصلاح خطأ تضاعف LAYER_DECAY + تصحيح إشارة الاتجاه',
    dataSource:  'Supabase (with static fallback)',
  })
}
