import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const SOURCES = [
  { id: 'argaam',   name: 'أرقام',  icon: '📊', url: 'https://www.argaam.com/ar/rss/' },
  { id: 'mubasher', name: 'مباشر',  icon: '📈', url: 'https://mubasher.info/rss/sa'   },
  { id: 'spa',      name: 'واس',    icon: '🇸🇦', url: 'https://www.spa.gov.sa/rss.php?l=ar' },
  { id: 'reuters',  name: 'رويترز', icon: '🌐', url: 'https://feeds.reuters.com/reuters/businessNews' },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sourceId = searchParams.get('source') // optional filter

  const sources = sourceId ? SOURCES.filter(s => s.id === sourceId) : SOURCES

  const results = await Promise.allSettled(
    sources.map(src => fetchSource(src))
  )

  const items = results
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .filter((item, idx, arr) => arr.findIndex(x => x.id === item.id) === idx) // dedup
    .sort((a, b) => b.fetchedAt - a.fetchedAt)
    .slice(0, 40)

  return NextResponse.json({ success: true, data: items, count: items.length })
}

async function fetchSource(src: typeof SOURCES[0]) {
  // Layer 1: rss2json
  try {
    const url  = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(src.url)}&count=15`
    const res  = await fetch(url, { signal: AbortSignal.timeout(7000) })
    if (!res.ok) throw new Error()
    const data = await res.json()
    if (data.status !== 'ok') throw new Error()
    return (data.items as any[]).slice(0, 12).map(it => parseJsonItem(it, src))
  } catch {}

  // Layer 2: allorigins proxy
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(src.url)}`
    const res   = await fetch(proxy, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error()
    const data  = await res.json()
    return parseXMLFeed(data.contents ?? '', src)
  } catch {}

  return []
}

function parseJsonItem(it: any, src: typeof SOURCES[0]) {
  const title = cleanText(it.title ?? '')
  const desc  = cleanText(it.description ?? '').slice(0, 200)
  return {
    id:         simpleHash(title),
    title, desc,
    link:       it.link ?? '',
    pubDate:    it.pubDate ?? '',
    source:     src.name,
    sourceId:   src.id,
    sourceIcon: src.icon,
    text:       `${title} ${desc}`.trim(),
    lang:       'ar' as const,
    fetchedAt:  Date.now(),
  }
}

function parseXMLFeed(xml: string, src: typeof SOURCES[0]) {
  const items: ReturnType<typeof parseJsonItem>[] = []
  const re    = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml)) !== null && items.length < 12) {
    const raw   = m[1]
    const title = cleanText(getTag(raw, 'title'))
    const desc  = cleanText(getTag(raw, 'description')).slice(0, 200)
    const link  = getTag(raw, 'link').trim()
    if (title.length < 5) continue
    items.push({
      id: simpleHash(title), title, desc, link,
      pubDate: getTag(raw, 'pubDate'),
      source: src.name, sourceId: src.id, sourceIcon: src.icon,
      text: `${title} ${desc}`.trim(), lang: 'ar',
      fetchedAt: Date.now(),
    })
  }
  return items
}

function getTag(s: string, tag: string) {
  const m = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\s\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i').exec(s)
  return m ? m[1] : ''
}
function cleanText(h: string) {
  return h.replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<')
          .replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()
}
function simpleHash(s: string) {
  let h = 0
  for (let i = 0; i < Math.min(s.length, 50); i++) { h = ((h<<5)-h)+s.charCodeAt(i); h|=0 }
  return 'mw' + Math.abs(h).toString(36)
}
