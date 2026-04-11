// ══════════════════════════════════════════════════════════════════
// المسار: src/lib/network-loader.ts
// المرحلة (ج): دالة تحميل بيانات الشبكة من Supabase (server-side)
// الحالة: ملف جديد
// الاستخدام: في API routes فقط (ليس في Client Components)
// ══════════════════════════════════════════════════════════════════
 
import { createAdminClient } from '@/lib/supabase'
import {
  OWNERSHIP_RELATIONS,
  NEWS_TYPES,
  STOCK_INFO,
  type OwnershipRelation,
  type NewsType,
} from '@/data/network-db'
 
// Cache بسيط في الذاكرة — يُحدَّث كل 5 دقائق
let cachedRelations: OwnershipRelation[] | null = null
let cachedNewsTypes: Record<string, NewsType> | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 دقائق
 
// ── تحميل العلاقات ────────────────────────────────────────────────
export async function loadRelations(): Promise<OwnershipRelation[]> {
  const now = Date.now()
  if (cachedRelations && now - cacheTime < CACHE_TTL) {
    return cachedRelations
  }
 
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ownership_relations')
      .select('*')
      .eq('active', true)
      .order('ownership_pct', { ascending: false })
 
    if (!error && data && data.length > 0) {
      // تحويل بيانات Supabase لنفس شكل OwnershipRelation
      cachedRelations = data.map((r: any): OwnershipRelation => ({
        id:            r.id,
        owner_code:    r.owner_code,
        owner_name:    r.owner_name,
        owned_code:    r.owned_code,
        owned_name:    r.owned_name,
        ownership_pct: parseFloat(r.ownership_pct),
        relation_type: r.relation_type,
        layer:         r.layer,
        strength:      r.strength,
        decay_factor:  parseFloat(r.decay_factor),
        owner_sector:  r.owner_sector ?? '',
        owned_sector:  r.owned_sector ?? '',
        source:        r.source ?? '',
        verified:      r.verified,
      }))
      cacheTime = now
      return cachedRelations
    }
  } catch {}
 
  // Fallback: البيانات الثابتة
  return OWNERSHIP_RELATIONS
}
 
// ── تحميل قاموس الأخبار ───────────────────────────────────────────
export async function loadNewsTypes(): Promise<Record<string, NewsType>> {
  const now = Date.now()
  if (cachedNewsTypes && now - cacheTime < CACHE_TTL) {
    return cachedNewsTypes
  }
 
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('news_types')
      .select('*')
      .eq('active', true)
 
    if (!error && data && data.length > 0) {
      cachedNewsTypes = {}
      for (const nt of data) {
        cachedNewsTypes[nt.type_id] = {
          type_id:       nt.type_id,
          name_ar:       nt.name_ar,
          direction:     nt.direction,
          lambda:        parseFloat(nt.lambda),
          half_life_hrs: nt.half_life_hrs,
          default_s:     parseFloat(nt.default_s),
          sector_impacts: nt.sector_impacts ?? {},
        }
      }
      return cachedNewsTypes
    }
  } catch {}
 
  return NEWS_TYPES
}
 
// ── تحميل معلومات سهم معين ────────────────────────────────────────
export async function loadStockInfo(code: string): Promise<{
  name: string; sector: string; market: string; liquidity: number
} | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('stocks_network')
      .select('name_ar, sector, market, liquidity_factor')
      .eq('code', code)
      .single()
 
    if (!error && data) {
      return {
        name:     data.name_ar,
        sector:   data.sector,
        market:   data.market,
        liquidity: parseFloat(data.liquidity_factor),
      }
    }
  } catch {}
 
  // Fallback: البيانات الثابتة
  return STOCK_INFO[code] ? {
    name:     STOCK_INFO[code].name,
    sector:   STOCK_INFO[code].sector,
    market:   STOCK_INFO[code].market,
    liquidity: STOCK_INFO[code].liquidity,
  } : null
}
 
// ── مسح الـ Cache (للاستخدام بعد تحديث البيانات) ─────────────────
export function clearNetworkCache() {
  cachedRelations  = null
  cachedNewsTypes  = null
  cacheTime        = 0
}
