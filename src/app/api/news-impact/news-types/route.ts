// ══════════════════════════════════════════════════════════════════
// الملف 6 من 10
// المسار: src/app/api/news-impact/news-types/route.ts
// الحالة: ملف جديد — انسخ هذا الكود كاملاً في المسار المذكور
// ══════════════════════════════════════════════════════════════════
 
import { NextRequest, NextResponse } from 'next/server'
import { NEWS_TYPES } from '@/data/network-db'
import { classifyNews } from '@/lib/news-impact-engine'
 
export async function GET() {
  const data = Object.values(NEWS_TYPES).map(nt => ({
    ...nt,
    decay_description: `نصف العمر: ${nt.half_life_hrs} ساعة — T(t) = e^(-${nt.lambda}×t)`,
  }))
  return NextResponse.json({ success:true, count:data.length, data })
}
 
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ success:false, error:'text مطلوب' }, { status:400 })
    const result = classifyNews(text)
    return NextResponse.json({ success:true, data:result })
  } catch (err: any) {
    return NextResponse.json({ success:false, error:err?.message }, { status:500 })
  }
}
