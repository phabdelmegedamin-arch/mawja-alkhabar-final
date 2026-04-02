import { NextRequest, NextResponse } from 'next/server'
import { sha256 } from '@/lib/utils'

const ADMIN_HASHES = {
  AU:  process.env.ADMIN_USERNAME_HASH ?? '9057f652e4dadfb37f55190933bfdd604114c9e287affcf78c6e60c9c5e4a207',
  AE:  process.env.ADMIN_EMAIL_HASH    ?? 'ca2063aba4ae4f5de66f7d7c31bee2d5e6042ded0ca6b592b2133257c7ded2cc',
  AP:  process.env.ADMIN_PASSWORD_HASH ?? 'c9703d888f4e747ffff62688991200b03b0c0f43ba85ce9822027254ed6dc71a',
  AP2: process.env.ADMIN_PASSWORD2_HASH ?? '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'بيانات ناقصة' }, { status: 400 })
    }

    const uh = await sha256(username)
    const ph = await sha256(password)

    // Admin check (hardcoded hashes)
    const isAdmin = (uh === ADMIN_HASHES.AU || uh === ADMIN_HASHES.AE)
                 && (ph === ADMIN_HASHES.AP  || ph === ADMIN_HASHES.AP2)

    if (isAdmin) {
      return NextResponse.json({
        success: true,
        data: {
          plan:     'admin',
          name:     'Abdulmageedamin',
          token:    `admin-${Date.now()}`,
          lifetime: true,
          ts:       Date.now(),
        },
      })
    }

    // Supabase check
    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email:    username.includes('@') ? username : `${username}@mawjakhabar.com`,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, name, plan, status, expires_at')
      .eq('id', authData.user.id)
      .single()

    if (profile?.status === 'expired') {
      return NextResponse.json({ success: false, error: 'انتهت صلاحية اشتراكك' }, { status: 403 })
    }

    // Update last login
    await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', authData.user.id)

    return NextResponse.json({
      success: true,
      data: {
        plan:      profile?.plan ?? 'free',
        name:      profile?.name ?? profile?.username ?? username,
        token:     authData.session?.access_token ?? '',
        ts:        Date.now(),
        expiresAt: profile?.expires_at,
      },
    })
  } catch (err) {
    console.error('[/api/auth/login]', err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}
