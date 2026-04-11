// ══════════════════════════════════════════════════════════════════
// المسار: src/app/api/news-impact/relations/route.ts
// المرحلة (ج): يقرأ من Supabase أولاً — fallback للبيانات الثابتة
// الحالة: استبدال الملف 05 السابق بهذا
// ══════════════════════════════════════════════════════════════════
 
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { OWNERSHIP_RELATIONS } from '@/data/network-db'
 
// ── GET /api/news-impact/relations ───────────────────────────────
// Query params: ownerCode, ownedCode, type, layer
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ownerCode = searchParams.get('ownerCode')
  const ownedCode = searchParams.get('ownedCode')
  const type      = searchParams.get('type')
  const layer     = searchParams.get('layer')
 
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('ownership_relations')
      .select('*')
      .eq('active', true)
      .order('ownership_pct', { ascending: false })
 
    if (ownerCode) query = query.eq('owner_code', ownerCode)
    if (ownedCode) query = query.eq('owned_code', ownedCode)
    if (type)      query = query.eq('relation_type', type)
    if (layer)     query = query.eq('layer', parseInt(layer))
 
    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return NextResponse.json({ success:true, source:'supabase', count:data.length, data })
    }
    throw new Error('Supabase empty — using fallback')
 
  } catch {
    // Fallback: البيانات الثابتة
    let data = [...OWNERSHIP_RELATIONS]
    if (ownerCode) data = data.filter(r => r.owner_code === ownerCode)
    if (ownedCode) data = data.filter(r => r.owned_code === ownedCode)
    if (type)      data = data.filter(r => r.relation_type === type)
    if (layer)     data = data.filter(r => r.layer === parseInt(layer))
 
    return NextResponse.json({ success:true, source:'static', count:data.length, data })
  }
}
 
// ── POST /api/news-impact/relations — إضافة علاقة جديدة ──────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { owner_code, owned_code, ownership_pct, relation_type, layer,
            strength, owner_sector, owned_sector, source, verified } = body
 
    if (!owner_code || !owned_code || !relation_type)
      return NextResponse.json({ success:false, error:'owner_code و owned_code و relation_type مطلوبة' }, { status:400 })
 
    const decay_map: Record<number,number> = { 1:1.0, 2:0.7, 3:0.5, 4:0.25 }
 
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ownership_relations')
      .insert({
        owner_code, owned_code, ownership_pct: ownership_pct ?? 0,
        relation_type, layer: layer ?? 1,
        decay_factor: decay_map[layer ?? 1] ?? 1.0,
        strength: strength ?? 5,
        owner_sector, owned_sector, source, verified: verified ?? false,
      })
      .select()
      .single()
 
    if (error) throw error
    return NextResponse.json({ success:true, data })
  } catch (err: any) {
    return NextResponse.json({ success:false, error:err?.message }, { status:500 })
  }
}
 
// ── PUT /api/news-impact/relations — تعديل علاقة ─────────────────
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
 
    if (!id)
      return NextResponse.json({ success:false, error:'id مطلوب' }, { status:400 })
 
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ownership_relations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
 
    if (error) throw error
    return NextResponse.json({ success:true, data })
  } catch (err: any) {
    return NextResponse.json({ success:false, error:err?.message }, { status:500 })
  }
}
