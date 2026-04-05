import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('admins')
      .select('id, username, role, created_at')
      .order('created_at', { ascending: true })
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, username, password_hash, role } = await req.json()
    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    if (action === 'add') {
      if (!username || !password_hash) {
        return NextResponse.json({ success: false, error: 'بيانات ناقصة' }, { status: 400 })
      }
      const { error } = await supabase.from('admins').insert({
        username, password_hash, role: role ?? 'sub',
      })
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('username', username)
        .neq('role', 'main')
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'action غير معروف' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
