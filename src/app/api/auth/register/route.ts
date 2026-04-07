import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name, username, email, phone, password, plan, amount, promoCode, isFree } = await req.json()

    if (!username || !email || !password || !plan) {
      return NextResponse.json({ success: false, error: 'بيانات ناقصة' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existing) {
      return NextResponse.json({ success: false, error: 'اسم المستخدم محجوز' }, { status: 409 })
    }

    // التحقق من الكود المجاني
    let validatedCode = null
    if (promoCode && isFree) {
      const { data: codeData } = await supabase
        .from('subscription_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('active', true)
        .single()

      if (!codeData) {
        return NextResponse.json({ success: false, error: 'الكود غير صالح أو مستخدم مسبقاً' }, { status: 400 })
      }
      if (codeData.expiry && new Date(codeData.expiry) < new Date()) {
        return NextResponse.json({ success: false, error: 'انتهت صلاحية الكود' }, { status: 400 })
      }
      validatedCode = codeData
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password,
      user_metadata: { username, name, phone },
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: authError?.message ?? 'فشل إنشاء الحساب' }, { status: 400 })
    }

    const userId = authData.user.id

    await supabase.from('profiles').update({
      name, phone,
      plan:   validatedCode ? validatedCode.plan : 'pending',
      status: validatedCode ? 'active' : 'pending',
    }).eq('id', userId)

    const finalAmount = validatedCode ? 0 : (amount ?? 0)
    const vat         = validatedCode ? 0 : +(finalAmount * 0.15).toFixed(2)
    const total       = validatedCode ? 0 : +(finalAmount * 1.15).toFixed(2)

    await supabase.from('subscriptions').insert({
      user_id:    userId,
      plan:       'pro',
      period:     plan,
      amount:     finalAmount,
      vat,
      total,
      status:     validatedCode ? 'active' : 'pending',
      promo_code: validatedCode ? promoCode.toUpperCase() : null,
    })

    if (validatedCode) {
      await supabase
        .from('subscription_codes')
        .update({
          active:       false,
          used_by:      userId,
          last_used_at: new Date().toISOString(),
        })
        .eq('code', promoCode.toUpperCase())
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        isFree: !!validatedCode,
        message: validatedCode
          ? 'تم تفعيل حسابك مجاناً بالكود!'
          : 'تم إنشاء الحساب — انتظر تأكيد الدفع',
      },
    })
  } catch (err) {
    console.error('[/api/auth/register]', err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}
