import { NextRequest, NextResponse } from 'next/server'
 
export const runtime = 'edge'
 
/* ──────────────────────────────────────────────────────────
   مصادر RSS — الروابط الصحيحة
   ────────────────────────────────────────────────────────── */
const SOURCES = [
  { id: 'argaam_main', name: 'أرقام',         icon: '📊', url: 'https://www.argaam.com/ar/rss/ho-main-news?sectionid=1524' },
  { id: 'argaam_disc', name: 'أرقام-إفصاحات', icon: '📋', url: 'https://www.argaam.com/ar/rss/ho-company-disclosures?sectionid=244' },
  { id: 'argaam_co',   name: 'أرقام-شركات',  icon: '🏢', url: 'https://www.argaam.com/ar/rss/companies?sectionid=1542' },
  { id: 'mubasher',    name: 'مباشر',         icon: '📈', url: 'https://www.mubasher.info/rss/sa' },
  { id: 'spa',         name: 'واس',           icon: '🇸🇦', url: 'https://www.spa.gov.sa/rss.php?l=ar' },
  { id: 'cnbcar',      name: 'CNBC عربية',    icon: '🌐', url: 'https://www.cnbcarabia.com/rss/all' },
]
 
/* Google News — يعمل من أي مكان (قاعدة) */
function googleNewsSearchUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ar&gl=SA&ceid=SA:ar`
}
 
/* ──────────────────────────────────────────────────────────
   GET handler
   ────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sourceId = searchParams.get('source')
  const query    = searchParams.get('q')                    // بحث محدد عن سهم
  const ticker   = searchParams.get('ticker')               // رمز السهم (اختياري)
  const debug    = searchParams.get('debug') === '1'
  const refresh  = searchParams.get('refresh') === '1'      // تجاوز CDN cache
 
  let sources: { id: string; name: string; icon: string; url: string }[]
 
  if (query) {
    // ─── بحث محدد عن سهم ───
    // استخدام علامات اقتباس + سياق مالي لتقليل الضوضاء
    // مثال: "بنك الجزيرة" 1020 (سهم OR تداول OR أرباح OR إفصاح)
    const financialContext = '(سهم OR تداول OR أرباح OR إفصاح OR تاسي OR مالية OR إيرادات OR نتائج)'
    const queries = [
      `"${query}" ${financialContext}`,                      // الاسم بالضبط + سياق مالي
      ticker ? `${ticker}` : null,                           // الرمز فقط (لو موجود)
    ].filter(Boolean) as string[]
 
    sources = queries.map((q, i) => ({
      id:   `gnews_q${i}`,
      name: 'Google News',
      icon: '🔎',
      url:  googleNewsSearchUrl(q),
    }))
 
    // إضافة أرقام كمصدر ثانوي مكمّل
    sources.push(...SOURCES.filter(s => s.id === 'argaam_main' || s.id === 'argaam_disc'))
  } else {
    // ─── الخلاصة العامة ───
    const generalSources = [
      // 3 استعلامات Google News متنوعة → يضمن وصول 30+ خبر حتى لو فشل البقية
      {
        id:   'gnews_market',
        name: 'Google News',
        icon: '🔎',
        url:  googleNewsSearchUrl('السوق السعودي تداول'),
      },
      {
        id:   'gnews_stocks',
        name: 'Google News',
        icon: '🔎',
        url:  googleNewsSearchUrl('الأسهم السعودية تاسي'),
      },
      {
        id:   'gnews_economy',
        name: 'Google News',
        icon: '🔎',
        url:  googleNewsSearchUrl('اقتصاد السعودية شركات'),
      },
      ...SOURCES,
    ]
    sources = sourceId ? generalSources.filter(s => s.id === sourceId) : generalSources
  }
 
  const results = await Promise.allSettled(sources.map(src => fetchSource(src)))
  const items = mergeResults(results, query ? 40 : 60)
  const diagnostics = buildDiagnostics(results, sources)
 
  // ── 🔑 منع تخزين النتائج الفارغة في CDN cache ──
  const cacheHeader = (items.length > 0 && !refresh)
    ? 'public, s-maxage=300, stale-while-revalidate=60'
    : 'no-store, no-cache, must-revalidate'
 
  const payload: any = { success: true, data: items, count: items.length }
  if (query) payload.query = query
  if (ticker) payload.ticker = ticker
  if (debug) payload.diagnostics = diagnostics
 
  // log في Vercel logs لتسهيل التشخيص (يظهر في Functions tab)
  console.log(`[/api/news] q=${query ?? '(general)'} count=${items.length} sources=${diagnostics.map(d => `${d.source}:${d.count}/${d.via}`).join(',')}`)
 
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': cacheHeader },
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
 
  /* ─── Layer 1: Direct fetch ─── */
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 9000)
    const res = await fetch(src.url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':      'Mozilla/5.0 (compatible; MawjaBot/1.0)',
        'Accept':          'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'Accept-Language': 'ar,en;q=0.9',
      },
      // @ts-ignore
      cache: 'no-store',
    })
    clearTimeout(t)
    if (res.ok) {
      const xml   = await res.text()
      const items = parseXMLFeed(xml, src)
      if (items.length > 0) return { items, via: 'direct' }
    }
  } catch {}
 
  /* ─── Layer 2: rss2json ─── */
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(src.url)}&count=15`
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
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
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 9000)
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(src.url)}`
    const res   = await fetch(proxy, { signal: ctrl.signal })
    clearTimeout(t)
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
