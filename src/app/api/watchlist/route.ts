import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const supabase    = createServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: true, data: [] })
  const { data } = await supabase.from('watchlist').select('*').eq('user_id', user.id)
  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase    = createServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'غير مسجّل' }, { status: 401 })

  const { action, ticker, name } = await req.json()

  if (action === 'add') {
    await (supabase.from('watchlist') as any).upsert({ user_id: user.id, ticker, name }, { onConflict: 'user_id,ticker' })
    return NextResponse.json({ success: true })
  }
  if (action === 'remove') {
    await (supabase.from('watchlist') as any).delete().eq('user_id', user.id).eq('ticker', ticker)
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ success: false, error: 'action غير معروف' }, { status: 400 })
}
