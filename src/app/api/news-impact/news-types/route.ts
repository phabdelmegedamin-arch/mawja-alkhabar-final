// ══════════════════════════════════════════════════════════════════
// المسار: src/app/api/news-impact/news-types/route.ts
// الحالة: ملف جديد
// ══════════════════════════════════════════════════════════════════
 
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { NEWS_TYPES } from '@/data/network-db'
import { classifyNews } from '@/lib/news-impact-engine'
 
interface NewsTypeRow {
  type_id:        string
  name_ar:        string
  direction:      string
  lambda:         number | string
  half_life_hrs:  number
  default_s:      number | string
  sector_impacts: Record<string, number>
  notes:          string | null
  active:         boolean
}
 
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('news_types')
      .select('*')
      .eq('active', true)
      .order('type_id')
 
    if (!error && data && data.length > 0) {
      const enriched = (data as NewsTypeRow[]).map((nt: NewsTypeRow) => ({
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
 
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text)
      return NextResponse.json({ success:false, error:'text مطلوب' }, { status:400 })
    const result = classifyNews(text)
    return NextResponse.json({ success:true, data:result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'خطأ غير معروف'
    return NextResponse.json({ success:false, error:message }, { status:500 })
  }
}
 
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'خطأ غير معروف'
    return NextResponse.json({ success:false, error:message }, { status:500 })
  }
}
