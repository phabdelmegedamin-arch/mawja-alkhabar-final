// ══════════════════════════════════════════════════════════════════
// الملف 8 من 10
// المسار: src/app/api/news-impact/log/[id]/actual/route.ts
// الحالة: ملف جديد — انسخ هذا الكود كاملاً في المسار المذكور
// ══════════════════════════════════════════════════════════════════
 
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
 
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { actual_impacts, notes } = await req.json()
 
    if (!actual_impacts || !Array.isArray(actual_impacts))
      return NextResponse.json({ success:false, error:'actual_impacts مطلوب كـ array' }, { status:400 })
 
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('news_impact_log')
      .update({ actual_impacts, notes })
      .eq('log_id', params.id)
      .select()
      .single()
 
    if (error) throw error
    return NextResponse.json({ success:true, data })
  } catch (err: any) {
    return NextResponse.json({ success:false, error:err?.message }, { status:500 })
  }
}
