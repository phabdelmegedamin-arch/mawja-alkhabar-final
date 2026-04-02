import { NextRequest, NextResponse } from 'next/server'

// GET /api/subscribers — admin only
export async function GET(req: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    const { searchParams } = new URL(req.url)
    const q       = searchParams.get('q') ?? ''
    const status  = searchParams.get('status') ?? 'all'
    const plan    = searchParams.get('plan') ?? 'all'
    const page    = parseInt(searchParams.get('page') ?? '1')
    const perPage = parseInt(searchParams.get('per_page') ?? '50')

    let query = supabase
      .from('profiles')
      .select(`
        id, username, name, phone, plan, status,
        created_at, updated_at, last_login_at, expires_at,
        subscriptions(plan, period, amount, total, status, created_at, expires_at)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1)

    if (q)           query = query.or(`username.ilike.%${q}%,name.ilike.%${q}%`)
    if (status !== 'all') query = query.eq('status', status)
    if (plan !== 'all')   query = query.eq('plan', plan)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      meta: { total: count ?? 0, page, perPage },
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// POST /api/subscribers — activate/deactivate subscriber
export async function POST(req: NextRequest) {
  try {
    const { userId, action, plan, expiresAt } = await req.json()
    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    if (action === 'activate') {
      await supabase.from('profiles').update({
        plan:       plan ?? 'pro',
        status:     'active',
        expires_at: expiresAt,
      }).eq('id', userId)
    } else if (action === 'deactivate') {
      await supabase.from('profiles').update({
        status: 'cancelled',
      }).eq('id', userId)
    } else if (action === 'delete') {
      await supabase.auth.admin.deleteUser(userId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
