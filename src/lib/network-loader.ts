// ══════════════════════════════════════════════════════════════════
// المسار: src/lib/network-loader.ts
// الحالة: ملف جديد
// ══════════════════════════════════════════════════════════════════
 
import { createAdminClient } from '@/lib/supabase'
import {
  OWNERSHIP_RELATIONS,
  NEWS_TYPES,
  STOCK_INFO,
  type OwnershipRelation,
  type NewsType,
} from '@/data/network-db'
 
let cachedRelations: OwnershipRelation[] = []
let cachedNewsTypes: Record<string, NewsType> = {}
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000
 
export async function loadRelations(): Promise<OwnershipRelation[]> {
  const now = Date.now()
  if (cachedRelations.length > 0 && now - cacheTime < CACHE_TTL) {
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
      cachedRelations = data.map((r: {
        id: number
        owner_code: string
        owner_name: string
        owned_code: string
        owned_name: string
        ownership_pct: string | number
        relation_type: string
        layer: number
        strength: number
        decay_factor: string | number
        owner_sector: string | null
        owned_sector: string | null
        source: string | null
        verified: boolean
      }): OwnershipRelation => ({
        id:            r.id,
        owner_code:    r.owner_code,
        owner_name:    r.owner_name,
        owned_code:    r.owned_code,
        owned_name:    r.owned_name,
        ownership_pct: parseFloat(String(r.ownership_pct)),
        relation_type: r.relation_type as OwnershipRelation['relation_type'],
        layer:         r.layer as 1 | 2 | 3 | 4,
        strength:      r.strength,
        decay_factor:  parseFloat(String(r.decay_factor)),
        owner_sector:  r.owner_sector ?? '',
        owned_sector:  r.owned_sector ?? '',
        source:        r.source ?? '',
        verified:      r.verified,
      }))
      cacheTime = now
      return cachedRelations
    }
  } catch {}
 
  return OWNERSHIP_RELATIONS
}
 
export async function loadNewsTypes(): Promise<Record<string, NewsType>> {
  const now = Date.now()
  if (Object.keys(cachedNewsTypes).length > 0 && now - cacheTime < CACHE_TTL) {
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
      for (const nt of data as Array<{
        type_id: string
        name_ar: string
        direction: string
        lambda: string | number
        half_life_hrs: number
        default_s: string | number
        sector_impacts: Record<string, number>
      }>) {
        cachedNewsTypes[nt.type_id] = {
          type_id:        nt.type_id,
          name_ar:        nt.name_ar,
          direction:      nt.direction as NewsType['direction'],
          lambda:         parseFloat(String(nt.lambda)),
          half_life_hrs:  nt.half_life_hrs,
          default_s:      parseFloat(String(nt.default_s)),
          sector_impacts: nt.sector_impacts ?? {},
        }
      }
      return cachedNewsTypes
    }
  } catch {}
 
  return NEWS_TYPES
}
 
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
        name:      (data as { name_ar: string; sector: string; market: string; liquidity_factor: string | number }).name_ar,
        sector:    (data as { name_ar: string; sector: string; market: string; liquidity_factor: string | number }).sector,
        market:    (data as { name_ar: string; sector: string; market: string; liquidity_factor: string | number }).market,
        liquidity: parseFloat(String((data as { name_ar: string; sector: string; market: string; liquidity_factor: string | number }).liquidity_factor)),
      }
    }
  } catch {}
 
  return STOCK_INFO[code] ? {
    name:      STOCK_INFO[code].name,
    sector:    STOCK_INFO[code].sector,
    market:    STOCK_INFO[code].market,
    liquidity: STOCK_INFO[code].liquidity,
  } : null
}
 
export function clearNetworkCache() {
  cachedRelations = []
  cachedNewsTypes = {}
  cacheTime       = 0
}
