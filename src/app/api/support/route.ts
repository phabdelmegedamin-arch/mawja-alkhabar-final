import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'

// ── Rate-limit خفيف داخل الذاكرة (حماية من السبام) ──────────────
const RATE_LIMIT_MAP = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_WINDOW_MS = 10 * 60_000  // 10 دقائق
const RATE_LIMIT_MAX       = 5            // 5 تذاكر كحد أقصى لكل IP في النافذة

function checkRateLimit(key: string): boolean {
  const now    = Date.now()
  const record = RATE_LIMIT_MAP.get(key)

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    RATE_LIMIT_MAP.set(key, { count: 1, windowStart: now })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX) return false

  record.count++
  return true
}

// ── تنظيف المدخلات ────────────────────────────────────────────────
function sanitize(v: unknown, maxLen = 500): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, maxLen).replace(/\u0000/g, '')
}

// ── POST /api/support — استقبال تذكرة جديدة ─────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'بيانات غير صالحة' },
        { status: 400 },
      )
    }

    // ── تنظيف ──
    const name     = sanitize(body.name,     100)
    const email    = sanitize(body.email,    150).toLowerCase()
    const phone    = sanitize(body.phone,    30) || null
    const subject  = sanitize(body.subject,  200)
    const message  = sanitize(body.message,  2000)
    const category = sanitize(body.category, 30) || 'general'
    const userId   = typeof body.userId === 'string' ? body.userId : null

    // ── فالديشن ──
    if (!name)    return NextResponse.json<ApiResponse>({ success: false, error: 'الاسم مطلوب' }, { status: 400 })
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json<ApiResponse>({ success: false, error: 'بريد إلكتروني غير صحيح' }, { status: 400 })
    if (subject.length < 5)
      return NextResponse.json<ApiResponse>({ success: false, error: 'الموضوع قصير جداً' }, { status: 400 })
    if (message.length < 15)
      return NextResponse.json<ApiResponse>({ success: false, error: 'الرسالة قصيرة — 15 حرفاً على الأقل' }, { status: 400 })

    // ── Rate-limit ──
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || req.headers.get('x-real-ip')
            || 'unknown'
    const rlKey = `${ip}:${email}`
    if (!checkRateLimit(rlKey)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'تجاوزت الحد المسموح — أعد المحاولة بعد 10 دقائق' },
        { status: 429 },
      )
    }

    // ── الأولوية حسب الفئة ──
    const priority =
      category === 'bug'       ? 'high'   :
      category === 'billing'   ? 'high'   :
      category === 'technical' ? 'normal' :
                                 'normal'

    // ── حفظ في Supabase ──
    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id:   userId,
        name, email, phone,
        category, subject, message,
        priority,
        status:    'open',
      })
      .select('id, ticket_no, created_at')
      .single()

    if (error) {
      console.error('[POST /api/support] Supabase error:', error)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'تعذّر حفظ التذكرة — حاول لاحقاً' },
        { status: 500 },
      )
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id:         data.id,
        ticket_no:  data.ticket_no,
        created_at: data.created_at,
      },
      message: 'تم استلام التذكرة بنجاح',
    })

  } catch (err) {
    console.error('[POST /api/support]', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'خطأ داخلي' },
      { status: 500 },
    )
  }
}

// ── GET /api/support?email=... — المستخدم يشوف تذاكره ───────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = sanitize(searchParams.get('email') ?? '', 150).toLowerCase()

    if (!email) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'البريد مطلوب' },
        { status: 400 },
      )
    }

    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, ticket_no, category, subject, status, priority, created_at, replied_at, admin_reply')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json<ApiResponse>({
      success: true,
      data:    data ?? [],
    })

  } catch (err) {
    console.error('[GET /api/support]', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'خطأ داخلي' },
      { status: 500 },
    )
  }
}
