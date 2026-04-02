import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name, username, email, phone, password, plan, amount } = await req.json()

    if (!username || !email || !password || !plan) {
      return NextResponse.json({ success: false, error: 'بيانات ناقصة' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    // Check username not taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existing) {
      return NextResponse.json({ success: false, error: 'اسم المستخدم محجوز' }, { status: 409 })
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password,
      user_metadata: { username, name, phone },
      email_confirm: true, // auto-confirm for now
    })

    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: authError?.message ?? 'فشل إنشاء الحساب' }, { status: 400 })
    }

    // Update profile
    await supabase.from('profiles').update({
      name, phone,
      plan:   'pending',
      status: 'pending',
    }).eq('id', authData.user.id)

    // Create subscription record
    const vat   = amount ? +(amount * 0.15).toFixed(2) : 0
    const total = amount ? +(amount * 1.15).toFixed(2) : 0

    await supabase.from('subscriptions').insert({
      user_id: authData.user.id,
      plan:    'pro',
      period:  plan,
      amount,
      vat,
      total,
      status:  'pending',
    })

    return NextResponse.json({
      success: true,
      data:    { userId: authData.user.id, message: 'تم إنشاء الحساب — انتظر تأكيد الدفع' },
    })
  } catch (err) {
    console.error('[/api/auth/register]', err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}
