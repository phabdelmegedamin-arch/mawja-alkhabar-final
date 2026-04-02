import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const { createAdminClient } = await import('@/lib/supabase')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('subscription_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function POST(req: NextRequest) {
  try {
    const { action, code, note, expiry, plan = 'pro' } = await req.json()
    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    if (action === 'create') {
      const { data, error } = await supabase.from('subscription_codes').insert({
        code: code.toUpperCase(), note, expiry: expiry || null, plan, active: true,
        created_at: new Date().toISOString(),
      }).select().single()
      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    if (action === 'toggle') {
      const { data: existing } = await supabase.from('subscription_codes').select('active').eq('code', code).single()
      await supabase.from('subscription_codes').update({ active: !existing?.active }).eq('code', code)
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      await supabase.from('subscription_codes').delete().eq('code', code)
      return NextResponse.json({ success: true })
    }

    if (action === 'redeem') {
      const { userId } = await req.json()
      const { data: codeData } = await supabase
        .from('subscription_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('active', true)
        .single()

      if (!codeData) return NextResponse.json({ success: false, error: 'كود غير صالح' }, { status: 404 })
      if (codeData.expiry && new Date(codeData.expiry) < new Date()) {
        return NextResponse.json({ success: false, error: 'انتهت صلاحية الكود' }, { status: 400 })
      }

      await supabase.from('subscription_codes').update({
        active: false, used_by: userId, last_used_at: new Date().toISOString(),
      }).eq('code', code.toUpperCase())

      await supabase.from('profiles').update({
        plan: codeData.plan, status: 'active',
      }).eq('id', userId)

      return NextResponse.json({ success: true, data: { plan: codeData.plan } })
    }

    return NextResponse.json({ success: false, error: 'action غير معروف' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
