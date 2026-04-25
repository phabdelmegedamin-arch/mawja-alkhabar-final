// ══════════════════════════════════════════════════════════════════
// المسار: src/app/api/analyze/route.ts
// ══════════════════════════════════════════════════════════════════
 
import { NextRequest, NextResponse } from 'next/server'
import { analyzeSentiment, detectSectors, buildRipples, buildTimeline, detectPrimaryStockFromText } from '@/lib/nlp'
import {
  calculateNewsImpact,
  extractOriginStockFromText,
  classifyNews,
} from '@/lib/news-impact-engine'
import type { AnalyzeRequest, ApiResponse, AnalysisResult } from '@/types'
 
export const runtime = 'edge'
 
// ── جدول baseImpact من نوع الخبر — مستقل عن NLP ─────────────────
// هذا هو الإصلاح الجوهري:
// baseImpact لا يُحسب من sentiment.score (الذي يعطي 0 للأخبار المحايدة)
// بل يُحسب من classifyNews الذي يقرأ نوع الخبر وقوته الفعلية
const NEWS_BASE_IMPACT: Record<string, number> = {
  EARNINGS_BEAT:    8.0,   // أرباح أفضل من المتوقع → تأثير قوي إيجابي
  EARNINGS_MISS:   -7.0,   // أرباح أقل → تأثير سلبي
  DIVIDEND:         5.0,   // توزيعات → إيجابي متوسط
  OWNERSHIP_CHANGE: 9.0,   // استحواذ/اندماج → تأثير قوي جداً
  MAJOR_CONTRACT:   7.0,   // عقد حكومي ضخم → إيجابي
  OIL_UP:           6.0,   // ارتفاع النفط → إيجابي للطاقة
  OIL_DOWN:        -5.0,   // انخفاض النفط → سلبي
  OPEC_CUT:         4.0,   // قرار أوبك → إيجابي معتدل
  RATE_HIKE:        3.0,   // رفع الفائدة → إيجابي للبنوك
  RATE_CUT:         3.0,   // خفض الفائدة → إيجابي للعقار
  GUIDANCE_UP:      6.0,   // رفع التوقعات → إيجابي
  REGULATORY:       4.0,   // قرار تنظيمي → إيجابي معتدل
  GENERAL:          2.0,   // خبر عام → تأثير بسيط
}
 
export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequest = await req.json()
    const { text, market = 'SA', waves = '3', useAI = false } = body
 
    if (!text || text.trim().length < 15) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'النص قصير جداً — 15 حرف على الأقل' },
        { status: 400 }
      )
    }
 
    const trimmed      = text.trim()
    const sentiment    = analyzeSentiment(trimmed)
    const sectorResult = detectSectors(trimmed)
    const { primary, allSectors } = sectorResult
    const sectorDetectedCode = detectPrimaryStockFromText(trimmed)
    const ripples  = buildRipples(primary, allSectors, sentiment, waves, sectorDetectedCode)
    const timeline = buildTimeline(sentiment)
 
    // ── ١. Claude Insight (اختياري) ────────────────────────────
    let insight: string | undefined
    if (useAI) {
      const apiKey = req.headers.get('x-api-key') || process.env.ANTHROPIC_API_KEY
      if (apiKey) insight = await fetchClaudeInsight(trimmed, primary, allSectors, sentiment, apiKey)
    }
 
    // ── ٢. محرك الشبكة ─────────────────────────────────────────
    // نستخدم الكود المكتشف من detectSectors (مع NER المُحسَّن)
    // مع fallback لـ extractOriginStockFromText للتوافق
    const originCode = sectorDetectedCode ?? extractOriginStockFromText(trimmed)  // NER من nlp أولاً
 
    let networkResult: {
      meta: {
        requestId:     string
        timestamp:     string
        originStock:   { code: string; name: string; sector: string }
        baseImpact:    number
        parameters:    { S: number; M: number; T: number; marketState: string }
        totalAffected: number
        processingMs:  number
      }
      impacts: Array<{
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
        timeframeLabel: string
        path:           string[]
        formula:        string
        strength:       number
        propagationDir?: 'UPWARD' | 'DOWNWARD' | 'ORIGIN'
      }>
      warnings: string[]
    } | undefined
 
    let networkError: string | undefined
 
    if (originCode) {
      try {
        // ── الإصلاح الجوهري ──────────────────────────────────────
        // ١. صنّف الخبر لمعرفة نوعه واتجاهه وقوته الفعلية
        const classification = classifyNews(trimmed)
 
        // ٢. خذ baseImpact من جدول NEWS_BASE_IMPACT حسب نوع الخبر
        //    وليس من sentiment.score الذي يعطي 0 للأخبار الاقتصادية المحايدة
        let baseImpact = NEWS_BASE_IMPACT[classification.type] ?? 2.0
 
        // ٣. طبّق إشارة الاتجاه (إيجابي/سلبي) من تصنيف الخبر
        if (classification.direction === 'NEGATIVE') {
          baseImpact = -Math.abs(baseImpact)
        } else if (classification.direction === 'POSITIVE') {
          baseImpact = Math.abs(baseImpact)
        } else {
          // NEUTRAL: استخدم sentiment.score كـ fallback خفيف فقط
          const sentimentBoost = parseFloat((sentiment.score / 92 * 2).toFixed(2))
          baseImpact = sentimentBoost !== 0 ? sentimentBoost : baseImpact
        }
 
        // ٤. طبّق معامل المفاجأة من التصنيف
        //    S يأتي من classifyNews تلقائياً داخل calculateNewsImpact
        const engineResult = calculateNewsImpact({
          originStockCode:    originCode,
          baseImpact,
          newsText:           trimmed,
          marketState:        'NEUTRAL',
          hoursElapsed:       0,
          maxDepth:           parseInt(waves),
          minImpactThreshold: 0.05,
        })
 
        networkResult = {
          meta: {
            requestId:     engineResult.meta.requestId,
            timestamp:     engineResult.meta.timestamp,
            originStock:   engineResult.meta.originStock,
            baseImpact:    engineResult.meta.baseImpact,
            parameters:    engineResult.meta.parameters,
            totalAffected: engineResult.meta.totalAffected,
            processingMs:  engineResult.meta.processingMs,
          },
          impacts: engineResult.impacts.map(r => ({
            rank:           r.rank,
            stockCode:      r.stockCode,
            stockName:      r.stockName,
            sector:         r.sector,
            market:         r.market,
            impactPct:      r.impactPct,
            direction:      r.direction,
            relationType:   r.relationType,
            layer:          r.layer,
            ownershipPct:   r.ownershipPct,
            effectiveOwn:   r.effectiveOwn,
            timeframeLabel: r.timeframe.label,
            path:           r.path,
            formula:        r.formula,
            strength:       r.strength,
            // ✅ إصلاح جوهري: تمرير اتجاه الانتشار
            // بدون هذا الحقل، OwnershipAccordion يفلتر بـ UPWARD فيحصل على [] دائماً
            propagationDir: r.propagationDir,
          })),
          warnings: engineResult.warnings,
        }
      } catch (err) {
        networkError = err instanceof Error ? err.message : 'خطأ في محرك الشبكة'
        console.error('[network-engine]', networkError)
      }
    }
 
    // ── النتيجة النهائية ────────────────────────────────────────
    const result: AnalysisResult = {
      text: trimmed,
      sentiment,
      primary,
      allSectors,
      ripples,
      stocks:     ripples.filter(r => !r.isHead),
      timeline,
      insight,
      confidence: useAI ? 82 : originCode ? 75 : 65,
      usedAI:     !!insight,
      market,
      ts:         new Date().toISOString(),
      networkResult,
      originCode: originCode ?? undefined,
    }
 
    return NextResponse.json<ApiResponse<AnalysisResult>>({
      success: true,
      data:    result,
      ...(networkError && { message: `تحذير: ${networkError}` }),
    })
 
  } catch (err) {
    console.error('[/api/analyze]', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'خطأ في التحليل' }, { status: 500 })
  }
}
 
// ── Claude Insight ───────────────────────────────────────────────
async function fetchClaudeInsight(
  text: string, primary: string, allSectors: string[],
  sentiment: { dir: string; score: number }, apiKey: string
): Promise<string | undefined> {
  try {
    const { DB } = await import('@/data/market-db')
    const db = DB as Record<string, { label: string }>
    const pLabel   = db[primary]?.label ?? primary
    const sLabels  = allSectors.slice(0, 4).map(k => db[k]?.label).filter(Boolean).join('، ')
    const dirLabel = sentiment.dir === 'pos' ? 'إيجابي' : sentiment.dir === 'neg' ? 'سلبي' : 'محايد'
 
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'x-api-key':          apiKey,
        'anthropic-version':  '2023-06-01',
      },
      body: JSON.stringify({
        model:      process.env.NEXT_PUBLIC_CLAUDE_MODEL ?? 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [{
          role:    'user',
          content: `أنت محلل مالي متخصص في السوق السعودي.\nالخبر: "${text}"\nالقطاع: ${pLabel}\nالمرتبطة: ${sLabels}\nالاتجاه: ${dirLabel}\n\nاكتب تحليلاً موجزاً (3 جمل) يشمل التأثير الفوري والأسهم وتوصية. ابدأ مباشرة.`,
        }],
      }),
    })
    if (!res.ok) return undefined
    const data = await res.json()
    return data.content?.[0]?.text ?? undefined
  } catch {
    return undefined
  }
}
 
