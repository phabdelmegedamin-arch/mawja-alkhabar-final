// ══════════════════════════════════════════════════════════════════
// المسار: src/app/api/news-impact/news-types/route.ts
// المرحلة (ج): يقرأ من Supabase أولاً — fallback للبيانات الثابتة
// الحالة: استبدال الملف 06 السابق بهذا
// ══════════════════════════════════════════════════════════════════
 
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { NEWS_TYPES } from '@/data/network-db'
import { classifyNews } from '@/lib/news-impact-engine'
 
// ── GET /api/news-impact/news-types ──────────────────────────────
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('news_types')
      .select('*')
      .eq('active', true)
      .order('type_id')
 
    if (!error && data && data.length > 0) {
      const enriched = data.map(nt => ({
        ...nt,
        decay_description: `نصف العمر: ${nt.half_life_hrs} ساعة — T(t) = e^(-${nt.lambda}×t)`,
      }))
      return NextResponse.json({ success:true, source:'supabase', count:enriched.length, data:enriched })
    }
    throw new Error('Supabase empty — using fallback')
 
  } catch {
    const data = Object.values(NEWS_TYPES).map(nt => ({
      ...nt,
      decay_description: `نصف العمر: ${nt.half_life_hrs} ساعة — T(t) = e^(-${nt.lambda}×t)`,
    }))
    return NextResponse.json({ success:true, source:'static', count:data.length, data })
  }
}
 
// ── POST /api/news-impact/news-types — تصنيف نص خبر تلقائياً ─────
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text)
      return NextResponse.json({ success:false, error:'text مطلوب' }, { status:400 })
    const result = classifyNews(text)
    return NextResponse.json({ success:true, data:result })
  } catch (err: any) {
    return NextResponse.json({ success:false, error:err?.message }, { status:500 })
  }
}
 
// ── PUT /api/news-impact/news-types — تعديل نوع خبر ──────────────
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { type_id, ...updates } = body
 
    if (!type_id)
      return NextResponse.json({ success:false, error:'type_id مطلوب' }, { status:400 })
 
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('news_types')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('type_id', type_id)
      .select()
      .single()
 
    if (error) throw error
    return NextResponse.json({ success:true, data })
  } catch (err: any) {
    return NextResponse.json({ success:false, error:err?.message }, { status:500 })
  }
}
