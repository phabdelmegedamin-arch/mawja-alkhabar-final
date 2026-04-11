// ══════════════════════════════════════════════════════════════════
// المسار: src/app/api/news-impact/calculate/route.ts
// الحالة: ملف جديد — استبدل الملف 03 السابق بهذا
// الإصلاح: MarketState تُستورد من network-db وليس من engine
// ══════════════════════════════════════════════════════════════════
 
import { NextRequest, NextResponse } from 'next/server'
import { calculateNewsImpact, compareScenarios } from '@/lib/news-impact-engine'
import type { NewsImpactParams } from '@/lib/news-impact-engine'
import type { MarketState } from '@/data/network-db'
 
export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const body = await req.json()
 
    if (!body.originStockCode)
      return NextResponse.json({ success:false, error:'originStockCode مطلوب' }, { status:400 })
    if (body.baseImpact === undefined || body.baseImpact === null)
      return NextResponse.json({ success:false, error:'baseImpact مطلوب' }, { status:400 })
    if (Math.abs(parseFloat(body.baseImpact)) > 50)
      return NextResponse.json({ success:false, error:'baseImpact خارج النطاق (-50 إلى +50)' }, { status:400 })
 
    const params: NewsImpactParams = {
      originStockCode:    String(body.originStockCode).trim(),
      baseImpact:         parseFloat(body.baseImpact),
      newsText:           body.newsText ?? '',
      newsType:           body.newsType,
      surpriseFactor:     body.surpriseFactor !== undefined ? parseFloat(body.surpriseFactor) : undefined,
      marketState:        (['RISK_ON','NEUTRAL','RISK_OFF'].includes(body.marketState)
                            ? body.marketState : 'NEUTRAL') as MarketState,
      hoursElapsed:       body.hoursElapsed   !== undefined ? parseFloat(body.hoursElapsed)  : 0,
      maxDepth:           body.maxDepth       !== undefined ? parseInt(body.maxDepth)         : 3,
      minImpactThreshold: body.minImpactThreshold !== undefined ? parseFloat(body.minImpactThreshold) : 0.1,
    }
 
    if (body.mode === 'compare') {
      const scenarios = compareScenarios(params)
      return NextResponse.json({
        success: true, mode:'compare', data:scenarios,
        meta:{ processingMs: Date.now() - t0 },
      })
    }
 
    const result = calculateNewsImpact(params)
    return NextResponse.json({ success:true, mode:'single', data:result })
 
  } catch (err: any) {
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
    description: 'حساب تأثير خبر — Impact(B) = Base(A) × Ownership% × S × M × T(t) × L',
    parameters: {
      required: { originStockCode:'string', baseImpact:'number' },
      optional: { newsText:'string', surpriseFactor:'0.3-2.5', marketState:'RISK_ON|NEUTRAL|RISK_OFF', hoursElapsed:'number', maxDepth:'1-3', mode:'single|compare' },
    },
  })
}
