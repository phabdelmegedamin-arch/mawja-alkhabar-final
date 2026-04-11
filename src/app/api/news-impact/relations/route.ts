// ══════════════════════════════════════════════════════════════════
// الملف 5 من 10
// المسار: src/app/api/news-impact/relations/route.ts
// الحالة: ملف جديد — انسخ هذا الكود كاملاً في المسار المذكور
// ══════════════════════════════════════════════════════════════════
 
import { NextRequest, NextResponse } from 'next/server'
import { OWNERSHIP_RELATIONS } from '@/data/network-db'
 
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ownerCode = searchParams.get('ownerCode')
  const ownedCode = searchParams.get('ownedCode')
  const type      = searchParams.get('type')
  const layer     = searchParams.get('layer')
 
  let data = [...OWNERSHIP_RELATIONS]
  if (ownerCode) data = data.filter(r => r.owner_code === ownerCode)
  if (ownedCode) data = data.filter(r => r.owned_code === ownedCode)
  if (type)      data = data.filter(r => r.relation_type === type)
  if (layer)     data = data.filter(r => r.layer === parseInt(layer))
 
  return NextResponse.json({ success:true, count:data.length, data })
}
 
