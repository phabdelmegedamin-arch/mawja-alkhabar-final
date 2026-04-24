import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'

// ── ملاحظة أمنية ──
// في الإنتاج، أضف فحص session/admin-token هنا.
// حالياً نعتمد على أن المسار /admin محمي في الواجهة عبر useAuthStore.

// ── GET — قائمة التذاكر (مع فلاتر) ─────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status    = searchParams.get('status')    || 'all'
    const priority  = searchParams.get('priority')  || 'all'
    const category  = searchParams.get('category')  || 'all'
    const search    = searchParams.get('q')         || ''
    const page      = parseInt(searchParams.get('page')     || '1')
    const perPage   = Math.min(100, parseInt(searchParams.get('per_page') || '50'))

    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    let query = supabase
      .from('support_tickets')
      .select(`
        id, ticket_no, user_id, name, email, phone,
        category, subject, message, priority, status,
        admin_reply, admin_note,
        created_at, updated_at, replied_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1)

    if (status   !== 'all') query = query.eq('status', status)
    if (priority !== 'all') query = query.eq('priority', priority)
    if (category !== 'all') query = query.eq('category', category)
    if (search)             query = query.or(`subject.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`)

    const { data, error, count } = await query
    if (error) throw error

    // إحصائيات سريعة
    const { data: stats } = await supabase
      .from('support_tickets')
      .select('status, priority')

    const summary = {
      total:     count ?? 0,
      open:      stats?.filter(t => t.status   === 'open').length       ?? 0,
      in_progress: stats?.filter(t => t.status === 'in_progress').length ?? 0,
      resolved:  stats?.filter(t => t.status   === 'resolved').length   ?? 0,
      urgent:    stats?.filter(t => t.priority === 'urgent'
                             && t.status   !== 'closed'
                             && t.status   !== 'resolved').length       ?? 0,
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data,
      meta: { total: count ?? 0, page, perPage, summary },
    })

  } catch (err) {
    console.error('[GET /api/admin/support]', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: String(err) },
      { status: 500 },
    )
  }
}

// ── PATCH — تحديث تذكرة (حالة، رد، ملاحظة، أولوية) ─────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'معرّف التذكرة مطلوب' },
        { status: 400 },
      )
    }

    const { id } = body
    const update: Record<string, unknown> = {}

    // الحقول القابلة للتعديل
    if (typeof body.status      === 'string') {
      if (!['open','in_progress','resolved','closed'].includes(body.status)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'حالة غير صالحة' },
          { status: 400 },
        )
      }
      update.status = body.status
    }

    if (typeof body.priority    === 'string') {
      if (!['low','normal','high','urgent'].includes(body.priority)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'أولوية غير صالحة' },
          { status: 400 },
        )
      }
      update.priority = body.priority
    }

    if (typeof body.admin_reply === 'string') {
      update.admin_reply = body.admin_reply.trim().slice(0, 5000)
      if (update.admin_reply) {
        update.replied_at = new Date().toISOString()
        // عند أول رد، إن كانت مفتوحة حوّلها لقيد المعالجة
        if (!body.status) update.status = 'in_progress'
      }
    }

    if (typeof body.admin_note  === 'string') {
      update.admin_note = body.admin_note.trim().slice(0, 2000)
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'لا توجد حقول للتحديث' },
        { status: 400 },
      )
    }

    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('support_tickets')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json<ApiResponse>({
      success: true,
      data,
      message: 'تم تحديث التذكرة',
    })

  } catch (err) {
    console.error('[PATCH /api/admin/support]', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: String(err) },
      { status: 500 },
    )
  }
}

// ── DELETE — حذف تذكرة ──────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'معرّف التذكرة مطلوب' },
        { status: 400 },
      )
    }

    const { createAdminClient } = await import('@/lib/supabase')
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('support_tickets')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'تم حذف التذكرة',
    })

  } catch (err) {
    console.error('[DELETE /api/admin/support]', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: String(err) },
      { status: 500 },
    )
  }
}
