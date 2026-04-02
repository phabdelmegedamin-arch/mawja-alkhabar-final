import { NextRequest, NextResponse } from 'next/server'
import { analyzeSentiment, detectSectors, buildRipples, buildTimeline } from '@/lib/nlp'
import type { AnalyzeRequest, ApiResponse, AnalysisResult } from '@/types'

export const runtime = 'edge'

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
    const ripples  = buildRipples(primary, allSectors, sentiment, waves)
    const timeline = buildTimeline(sentiment)

    let insight: string | undefined
    if (useAI) {
      const apiKey = req.headers.get('x-api-key') || process.env.ANTHROPIC_API_KEY
      if (apiKey) insight = await fetchClaudeInsight(trimmed, primary, allSectors, sentiment, apiKey)
    }

    const result: AnalysisResult = {
      text: trimmed, sentiment, primary, allSectors, ripples,
      stocks: ripples.filter(r => !r.isHead), timeline, insight,
      confidence: useAI ? 82 : 70, usedAI: !!insight, market,
      ts: new Date().toISOString(),
    }

    return NextResponse.json<ApiResponse<AnalysisResult>>({ success: true, data: result })
  } catch (err) {
    console.error('[/api/analyze]', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'خطأ في التحليل' }, { status: 500 })
  }
}

async function fetchClaudeInsight(
  text: string, primary: string, allSectors: string[],
  sentiment: { dir: string; score: number }, apiKey: string
): Promise<string | undefined> {
  try {
    const { DB } = await import('@/data/market-db')
    const db = DB as Record<string, { label: string }>
    const pLabel  = db[primary]?.label ?? primary
    const sLabels = allSectors.slice(0,4).map(k => db[k]?.label).filter(Boolean).join('، ')
    const dirLabel = sentiment.dir === 'pos' ? 'إيجابي' : sentiment.dir === 'neg' ? 'سلبي' : 'محايد'

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.NEXT_PUBLIC_CLAUDE_MODEL ?? 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [{ role: 'user', content:
          `أنت محلل مالي متخصص في السوق السعودي.\nالخبر: "${text}"\nالقطاع: ${pLabel}\nالمرتبطة: ${sLabels}\nالاتجاه: ${dirLabel}\n\nاكتب تحليلاً موجزاً (3 جمل) يشمل التأثير الفوري والأسهم وتوصية. ابدأ مباشرة.`
        }],
      }),
    })
    if (!res.ok) return undefined
    const data = await res.json()
    return data.content?.[0]?.text ?? undefined
  } catch { return undefined }
}
