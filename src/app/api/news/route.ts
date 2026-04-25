import { NextRequest, NextResponse } from 'next/server'
 
export const runtime = 'edge'
 
/* ──────────────────────────────────────────────────────────
   مصادر RSS — الروابط الصحيحة (تم التحقق منها مباشرة)
   ────────────────────────────────────────────────────────── */
const SOURCES = [
  // Argaam — أهم مصدر للأخبار السعودية الاقتصادية
  { id: 'argaam_main', name: 'أرقام',         icon: '📊', url: 'https://www.argaam.com/ar/rss/ho-main-news?sectionid=1524' },
  { id: 'argaam_disc', name: 'أرقام-إفصاحات', icon: '📋', url: 'https://www.argaam.com/ar/rss/ho-company-disclosures?sectionid=244' },
  { id: 'argaam_co',   name: 'أرقام-شركات',  icon: '🏢', url: 'https://www.argaam.com/ar/rss/companies?sectionid=1542' },
 
  // Mubasher
  { id: 'mubasher',    name: 'مباشر',         icon: '📈', url: 'https://www.mubasher.info/rss/sa' },
 
  // Saudi Press Agency
  { id: 'spa',         name: 'واس',           icon: '🇸🇦', url: 'https://www.spa.gov.sa/rss.php?l=ar' },
 
  // CNBC Arabia (markets)
  { id: 'cnbcar',      name: 'CNBC عربية',    icon: '🌐', url: 'https://www.cnbcarabia.com/rss/all' },
]
 
/* Google News RSS — يعمل من أي مكان، لا يحتاج وسيط */
function googleNewsSearchUrl(query: string): string {
  // hl=ar (لغة الواجهة) | gl=SA (الموقع: السعودية) | ceid=SA:ar (تركيبة المنطقة:اللغة)
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ar&gl=SA&ceid=SA:ar`
}
 
/* ──────────────────────────────────────────────────────────
   GET handler
   ────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sourceId = searchParams.get('source')
  const query    = searchParams.get('q')                // بحث عن سهم/كلمة
  const debug    = searchParams.get('debug') === '1'
 
  // ─── حالة 1: بحث محدد عن سهم → Google News + بعض المصادر ───
  if (query) {
    const sources = [
      { id: 'gnews_q',  name: 'Google News', icon: '🔎', url: googleNewsSearchUrl(query) },
      // إضافة أرقام كمصدر ثانوي (في حال احتوى أخبار حديثة عن السهم)
      ...SOURCES.filter(s => s.id === 'argaam_main' || s.id === 'argaam_disc'),
    ]
 
    const results = await Promise.allSettled(sources.map(src => fetchSource(src)))
    const items = mergeResults(results, /* limit */ 40)
    const diagnostics = buildDiagnostics(results, sources)
 
    return jsonResponse(items, debug ? diagnostics : undefined, query)
  }
 
  // ─── حالة 2: الخلاصة العامة (كل المصادر) ───
  const sources = sourceId ? SOURCES.filter(s => s.id === sourceId) : SOURCES
  const results = await Promise.allSettled(sources.map(src => fetchSource(src)))
  const items   = mergeResults(results, 60)
  const diagnostics = buildDiagnostics(results, sources)
 
  return jsonResponse(items, debug ? diagnostics : undefined)
}
 
function jsonResponse(items: any[], diagnostics: any[] | undefined, query?: string) {
  const payload: any = { success: true, data: items, count: items.length }
  if (query) payload.query = query
  if (diagnostics) payload.diagnostics = diagnostics
 
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  })
}
 
function mergeResults(results: PromiseSettledResult<{ items: FetchedItem[]; via: string }>[], limit: number) {
  return results
    .flatMap(r => r.status === 'fulfilled' ? r.value.items : [])
    .filter((item, idx, arr) => arr.findIndex(x => x.id === item.id) === idx)
    .sort((a, b) => b.fetchedAt - a.fetchedAt)
    .slice(0, limit)
}
 
function buildDiagnostics(
  results: PromiseSettledResult<{ items: FetchedItem[]; via: string }>[],
  sources: { id: string }[],
) {
  return results.map((r, i) => ({
    source: sources[i].id,
    status: r.status,
    count:  r.status === 'fulfilled' ? r.value.items.length : 0,
    via:    r.status === 'fulfilled' ? r.value.via : 'failed',
    error:  r.status === 'rejected' ? String((r as any).reason).slice(0, 120) : undefined,
  }))
}
 
/* ──────────────────────────────────────────────────────────
   fetchSource — 3 طبقات احتياطية
   ────────────────────────────────────────────────────────── */
type FetchedItem = ReturnType<typeof parseJsonItem>
 
async function fetchSource(src: { id: string; name: string; icon: string; url: string }): Promise<{ items: FetchedItem[]; via: string }> {
 
  /* ─── Layer 1: Direct fetch (Edge runtime, no CORS) ─── */
  try {
    const res = await fetch(src.url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent':      'Mozilla/5.0 (compatible; MawjaBot/1.0; +https://mawja.app)',
        'Accept':          'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'Accept-Language': 'ar,en;q=0.9',
      },
      // @ts-ignore
      cache: 'no-store',
    })
    if (res.ok) {
      const xml   = await res.text()
      const items = parseXMLFeed(xml, src)
      if (items.length > 0) return { items, via: 'direct' }
    }
  } catch {}
 
  /* ─── Layer 2: rss2json ─── */
  try {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(src.url)}&count=15`
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) })
    if (res.ok) {
      const data = await res.json()
      if (data?.status === 'ok' && Array.isArray(data.items)) {
        const items = (data.items as any[]).slice(0, 12).map(it => parseJsonItem(it, src))
        if (items.length > 0) return { items, via: 'rss2json' }
      }
    }
  } catch {}
 
  /* ─── Layer 3: allorigins ─── */
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(src.url)}`
    const res   = await fetch(proxy, { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const data  = await res.json()
      const items = parseXMLFeed(data?.contents ?? '', src)
      if (items.length > 0) return { items, via: 'allorigins' }
    }
  } catch {}
 
  return { items: [], via: 'failed' }
}
 
/* ──────────────────────────────────────────────────────────
   Parsers
   ────────────────────────────────────────────────────────── */
function parseJsonItem(it: any, src: { id: string; name: string; icon: string }) {
  const title = cleanText(it.title ?? '')
  const desc  = cleanText(it.description ?? '').slice(0, 240)
  const pub   = it.pubDate ?? it.published ?? ''
  return {
    id:         simpleHash(title + '|' + src.id),
    title,
    desc,
    link:       it.link ?? '',
    pubDate:    pub,
    source:     src.name,
    sourceId:   src.id,
    sourceIcon: src.icon,
    text:       `${title} ${desc}`.trim(),
    lang:       'ar' as const,
    fetchedAt:  parseDate(pub),
  }
}
 
function parseXMLFeed(xml: string, src: { id: string; name: string; icon: string }) {
  const items: ReturnType<typeof parseJsonItem>[] = []
  if (!xml) return items
 
  const re = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null && items.length < 15) {
    const tag = m[1]
    const raw = m[2]
    const title = cleanText(getTag(raw, 'title'))
    if (title.length < 5) continue
 
    const desc = cleanText(
      getTag(raw, 'description') ||
      getTag(raw, 'summary')     ||
      getTag(raw, 'content')
    ).slice(0, 240)
 
    let link = ''
    if (tag === 'item') {
      link = getTag(raw, 'link').trim()
    } else {
      const lm = /<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i.exec(raw)
      link = lm ? lm[1] : ''
    }
 
    const pub = getTag(raw, 'pubDate') || getTag(raw, 'published') || getTag(raw, 'updated')
 
    items.push({
      id:         simpleHash(title + '|' + src.id),
      title,
      desc,
      link,
      pubDate:    pub,
      source:     src.name,
      sourceId:   src.id,
      sourceIcon: src.icon,
      text:       `${title} ${desc}`.trim(),
      lang:       'ar' as const,
      fetchedAt:  parseDate(pub),
    })
  }
  return items
}
 
function getTag(s: string, tag: string) {
  const m = new RegExp(
    `<${tag}\\b[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    'i',
  ).exec(s)
  return m ? m[1] : ''
}
 
function cleanText(h: string) {
  return h
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
 
function parseDate(s: string): number {
  if (!s) return Date.now()
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : Date.now()
}
 
function simpleHash(s: string) {
  let h = 0
  for (let i = 0; i < Math.min(s.length, 80); i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return 'mw' + Math.abs(h).toString(36)
}
 
