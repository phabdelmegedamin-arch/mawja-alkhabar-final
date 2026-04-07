import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'أدخل الكود' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('subscription_codes')
      .select('code, active, expiry, plan')
      .eq('code', code.trim().toUpperCase())
      .eq('active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ valid: false, error: 'الكود غير صحيح أو مستخدم مسبقاً' }, { status: 404 })
    }

    if (data.expiry && new Date(data.expiry) < new Date()) {
      return NextResponse.json({ valid: false, error: 'انتهت صلاحية الكود' }, { status: 400 })
    }

    return NextResponse.json({ valid: true, plan: data.plan })
  } catch (err) {
    return NextResponse.json({ valid: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}
