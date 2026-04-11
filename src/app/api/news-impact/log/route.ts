// ══════════════════════════════════════════════════════════════════
// الملف 7 من 10
// المسار: src/app/api/news-impact/log/route.ts
// الحالة: ملف جديد — انسخ هذا الكود كاملاً في المسار المذكور
// ══════════════════════════════════════════════════════════════════
 
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
 
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from   = searchParams.get('from')
    const to     = searchParams.get('to')
    const stock  = searchParams.get('stock')
    const type   = searchParams.get('type')
    const limit  = parseInt(searchParams.get('limit')  ?? '50')
    const offset = parseInt(searchParams.get('offset') ?? '0')
 
    const supabase = createAdminClient()
    let query = supabase
      .from('news_impact_log')
      .select('*')
      .order('timestamp', { ascending:false })
      .range(offset, offset + limit - 1)
 
    if (from)  query = query.gte('timestamp', from)
    if (to)    query = query.lte('timestamp', to)
    if (stock) query = query.eq('origin_stock', stock)
    if (type)  query = query.eq('news_type', type)
 
    const { data, error } = await query
    if (error) throw error
 
    return NextResponse.json({ success:true, count:data?.length ?? 0, data:data ?? [] })
  } catch (err: any) {
    // إذا الجدول غير موجود بعد — أرجع قائمة فارغة
    console.warn('[news-impact/log] Supabase error:', err?.message)
    return NextResponse.json({ success:true, count:0, data:[] })
  }
}
 
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { meta, impacts } = body
 
    if (!meta?.originStock?.code || meta?.baseImpact === undefined)
      return NextResponse.json({ success:false, error:'بيانات غير مكتملة' }, { status:400 })
 
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('news_impact_log')
      .insert({
        log_id:         meta.requestId,
        timestamp:      meta.timestamp,
        news_text:      body.newsText ?? '',
        news_type:      meta.newsClassification?.type ?? 'GENERAL',
        origin_stock:   meta.originStock.code,
        origin_name:    meta.originStock.name,
        base_impact:    meta.baseImpact,
        s_factor:       meta.parameters?.S  ?? 1.0,
        m_factor:       meta.parameters?.M  ?? 1.0,
        t_factor:       meta.parameters?.T  ?? 1.0,
        market_state:   meta.parameters?.marketState ?? 'NEUTRAL',
        hours_elapsed:  body.hoursElapsed ?? 0,
        total_affected: meta.totalAffected ?? impacts?.length ?? 0,
        results:        impacts ?? [],
        processing_ms:  meta.processingMs ?? 0,
        created_by:     body.createdBy ?? 'admin',
      })
      .select()
      .single()
 
    if (error) throw error
    return NextResponse.json({ success:true, data })
  } catch (err: any) {
    return NextResponse.json({ success:false, error:err?.message ?? 'خطأ في الحفظ' }, { status:500 })
  }
}
