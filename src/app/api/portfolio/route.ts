import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const supabase    = createServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'غير مسجّل' }, { status: 401 })
  const { data } = await supabase.from('portfolio').select('*').eq('user_id', user.id).order('added_at', { ascending: false })
  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase    = createServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'غير مسجّل' }, { status: 401 })

  const { action, ticker, name, qty, avgPrice, sector } = await req.json()

  if (action === 'add' || action === 'update') {
    const { data: existing } = await supabase.from('portfolio').select('id, qty, avg_price').eq('user_id', user.id).eq('ticker', ticker).single()
    if (existing) {
      const newQty   = existing.qty + qty
      const newAvg   = (existing.avg_price * existing.qty + avgPrice * qty) / newQty
      await supabase.from('portfolio').update({ qty: newQty, avg_price: newAvg, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('portfolio').insert({ user_id: user.id, ticker, name, qty, avg_price: avgPrice, sector })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'remove') {
    await supabase.from('portfolio').delete().eq('user_id', user.id).eq('ticker', ticker)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: 'action غير معروف' }, { status: 400 })
}
