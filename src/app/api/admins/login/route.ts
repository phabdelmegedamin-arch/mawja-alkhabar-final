import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { username, password_hash } = await req.json()
    if (!username || !password_hash) {
      return NextResponse.json({ success: false }, { status: 400 })
    }
    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('admins')
      .select('username, role')
      .eq('username', username)
      .eq('password_hash', password_hash)
      .single()
    if (error || !data) {
      return NextResponse.json({ success: false }, { status: 401 })
    }
    return NextResponse.json({ success: true, role: data.role })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
