import { NextRequest, NextResponse } from 'next/server'
 
export const runtime = 'edge'
 
/* ──────────────────────────────────────────────────────────
   مصادر RSS — سعودية + عربية + عالمية
   ────────────────────────────────────────────────────────── */
const SOURCES = [
  { id: 'argaam',    name: 'أرقام',       icon: '📊', url: 'https://www.argaam.com/ar/rss/' },
  { id: 'mubasher',  name: 'مباشر',       icon: '📈', url: 'https://www.mubasher.info/rss/sa' },
  { id: 'aleqt',     name: 'الاقتصادية',  icon: '📰', url: 'https://www.aleqt.com/rss.php' },
  { id: 'spa',       name: 'واس',         icon: '🇸🇦', url: 'https://www.spa.gov.sa/rss.php?l=ar' },
  { id: 'cnbcar',    name: 'CNBC عربية',  icon: '🌐', url: 'https://www.cnbcarabia.com/rss/all' },
  { id: 'reuters',   name: 'رويترز',      icon: '🌐', url: 'https://feeds.reuters.com/reuters/businessNews' },
]
 
/* ──────────────────────────────────────────────────────────
   GET handler
   ────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sourceId = searchParams.get('source')
  const debug    = searchParams.get('debug') === '1'
  const sources  = sourceId ? SOURCES.filter(s => s.id === sourceId) : SOURCES
 
  const results = await Promise.allSettled(
    sources.map(src => fetchSource(src))
  )
 
  // Per-source diagnostics for debugging
  const diagnostics = results.map((r, i) => ({
    source: sources[i].id,
    status: r.status,
    count:  r.status === 'fulfilled' ? r.value.items.length : 0,
    via:    r.status === 'fulfilled' ? r.value.via : 'failed',
    error:  r.status === 'rejected' ? String(r.reason).slice(0, 120) : undefined,
  }))
 
  const items = results
    .flatMap(r => r.status === 'fulfilled' ? r.value.items : [])
    .filter((item, idx, arr) => arr.findIndex(x => x.id === item.id) === idx)
    .sort((a, b) => b.fetchedAt - a.fetchedAt)
    .slice(0, 60)
 
  const payload: any = {
    success: true,
    data:    items,
    count:   items.length,
  }
  if (debug) payload.diagnostics = diagnostics
 
  return NextResponse.json(payload, {
    headers: {
      // 5 min CDN cache, 1 min stale-while-revalidate
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  })
}
 
/* ──────────────────────────────────────────────────────────
   fetchSource — 3 طبقات احتياطية
   1) Direct fetch (الأسرع والأكثر موثوقية على Edge)
   2) rss2json.com  (احتياط)
   3) allorigins.win (احتياط أخير)
   ────────────────────────────────────────────────────────── */
type FetchedItem = ReturnType<typeof parseJsonItem>
async function fetchSource(src: typeof SOURCES[0]): Promise<{ items: FetchedItem[]; via: string }> {
 
  /* ─── Layer 1: Direct fetch — Edge runtime, no CORS ─── */
  try {
    const res = await fetch(src.url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent':      'Mozilla/5.0 (compatible; MawjaBot/1.0; +https://mawja.app)',
        'Accept':          'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'Accept-Language': 'ar,en;q=0.9',
      },
      // @ts-ignore — Next.js Edge supports this option
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
    const url  = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(src.url)}&count=15`
    const res  = await fetch(url, { signal: AbortSignal.timeout(7000) })
    if (res.ok) {
      const data = await res.json()
      if (data?.status === 'ok' && Array.isArray(data.items)) {
        const items = (data.items as any[]).slice(0, 12).map(it => parseJsonItem(it, src))
        if (items.length > 0) return { items, via: 'rss2json' }
      }
    }
  } catch {}
 
  /* ─── Layer 3: allorigins proxy ─── */
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
function parseJsonItem(it: any, src: typeof SOURCES[0]) {
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
 
function parseXMLFeed(xml: string, src: typeof SOURCES[0]) {
  const items: ReturnType<typeof parseJsonItem>[] = []
  if (!xml) return items
 
  // Matches both <item>...</item> (RSS 2.0) and <entry>...</entry> (Atom)
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
      // Atom: <link href="..." />
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
 
