'use client'
import { useState, useEffect, useCallback } from 'react'

interface FeedItem {
  id: string
  title: string
  desc: string
  source: string
  link: string
  fetchedAt: number
  dir: 'pos' | 'neg' | 'neu'
  score: number
  sector?: string
  sectorIcon?: string
  isNew?: boolean
  isDemo?: boolean
}

const DEMO_NEWS: Omit<FeedItem, 'id' | 'fetchedAt' | 'isNew' | 'isDemo'>[] = [
  { title:'أرامكو السعودية تعلن نتائج الربع الأول وتحافظ على توزيعات الأرباح', desc:'أعلنت أرامكو عن نتائجها المالية مع الحفاظ على مستوى توزيعات الأرباح', source:'تجريبي', link:'', dir:'pos', score:72, sector:'الطاقة', sectorIcon:'🛢️' },
  { title:'البنوك السعودية ترفع أسعار الفائدة على القروض العقارية', desc:'رفعت معظم البنوك الكبرى أسعار الفائدة على القروض العقارية بنسبة 0.25 نقطة', source:'تجريبي', link:'', dir:'neg', score:55, sector:'البنوك', sectorIcon:'🏦' },
  { title:'سابك تعلن عن خطط توسعة في البتروكيماويات بتكلفة 3 مليارات ريال', desc:'أعلنت سابك عن خطط لتوسعة طاقتها الإنتاجية في قطاع البتروكيماويات', source:'تجريبي', link:'', dir:'pos', score:65, sector:'الطاقة', sectorIcon:'🛢️' },
  { title:'مجموعة stc تطلق خدمات الجيل السادس تجريبياً في الرياض وجدة', desc:'أطلقت STC خدمات الجيل السادس في مرحلتها التجريبية بالمدينتين الرئيسيتين', source:'تجريبي', link:'', dir:'pos', score:48, sector:'الاتصالات', sectorIcon:'📡' },
  { title:'انخفاض أسعار النفط يضغط على أسهم قطاع الطاقة في تداول', desc:'تراجعت أسعار النفط الخام مما أثر سلباً على أداء أسهم شركات قطاع الطاقة', source:'تجريبي', link:'', dir:'neg', score:68, sector:'الطاقة', sectorIcon:'🛢️' },
  { title:'البنك الأهلي يرفع توقعاته لنمو الناتج المحلي السعودي إلى 3.8%', desc:'رفع البنك الأهلي توقعاته لنمو الاقتصاد الوطني مدفوعاً بزيادة الإنفاق الحكومي', source:'تجريبي', link:'', dir:'pos', score:42, sector:'البنوك', sectorIcon:'🏦' },
  { title:'تراجع حركة التداول في ظل ترقب بيانات التضخم الأمريكي', desc:'شهد سوق الأسهم السعودية تراجعاً في حجم التداول مع ترقب المستثمرين للبيانات الأمريكية', source:'تجريبي', link:'', dir:'neu', score:22, sector:'عام', sectorIcon:'📊' },
]

// قواميس NLP لتحليل المشاعر
const POS_WORDS = [
  'ارتفع','ارتفعت','نما','نمو','أرباح','توزيع','إطلاق','افتتاح',
  'تجاوز','قفز','شراكة','صفقة','تحسن','طفرة','انتعاش','نجح',
  'زيادة','توسعة','مشروع','استثمار','دعم','تحفيز','ازدهار',
  'صعود','مكاسب','إنجاز','تعافي','نجاح','فوز','عقد',
]
const NEG_WORDS = [
  'انخفض','انخفضت','تراجع','تراجعت','هبط','هبطت','خسارة','خسائر',
  'أزمة','غرامة','تسريح','انهيار','تضرر','ركود','ضغط','تدهور',
  'إفلاس','انكماش','عقوبات','فشل','رفع الفائدة','تشديد',
  'نزول','ضعف','تباطؤ','مخاوف','قلق','هزيمة','تأخر','تعثر',
]

function analyzeSentiment(text: string): { dir: 'pos' | 'neg' | 'neu'; score: number } {
  const t = text.toLowerCase()
  const ps = POS_WORDS.filter(w => t.includes(w)).length
  const ns = NEG_WORDS.filter(w => t.includes(w)).length
  const score = Math.min(92, 20 + Math.max(ps, ns) * 14)
  const dir: 'pos' | 'neg' | 'neu' = ps > ns ? 'pos' : ns > ps ? 'neg' : 'neu'
  return { dir, score }
}

/* ─── تخمين القطاع بناءً على الكلمات في النص ─── */
function guessSector(text: string): { sector: string; sectorIcon: string } {
  const t = text.toLowerCase()
  if (/أرامكو|نفط|بترول|طاقة|غاز|سابك|كيمياء|بتروكيماو/.test(t)) return { sector: 'الطاقة',     sectorIcon: '🛢️' }
  if (/بنك|راجحي|الأهلي|الاتحاد|البلاد|إنماء|مصرف|تمويل|قرض|فائدة/.test(t)) return { sector: 'البنوك',    sectorIcon: '🏦' }
  if (/stc|اتصالات|موبايلي|زين|إنترنت|الجيل/.test(t)) return { sector: 'الاتصالات',  sectorIcon: '📡' }
  if (/عقار|إسكان|تطوير|مدن|مشاريع/.test(t)) return { sector: 'العقارات',   sectorIcon: '🏗️' }
  if (/تأمين|تكافل|بوبا|ميدغلف/.test(t)) return { sector: 'التأمين',    sectorIcon: '🛡️' }
  if (/المراعي|سدافكو|نديك|أغذية|غذاء/.test(t)) return { sector: 'الأغذية',    sectorIcon: '🍞' }
  if (/مستشفى|دواء|صحة|طبي|الحبيب|المواساة/.test(t)) return { sector: 'الرعاية الصحية', sectorIcon: '🏥' }
  if (/تجزئة|أسواق|العثيم|بن داود|نهدي|الدواء/.test(t)) return { sector: 'التجزئة',   sectorIcon: '🛒' }
  if (/سيارات|نقل|طيران|طيار|شحن|لوجستي/.test(t)) return { sector: 'النقل',      sectorIcon: '🚚' }
  if (/تداول|مؤشر|تاسي|أسهم|سوق|بورصة/.test(t)) return { sector: 'السوق',      sectorIcon: '📊' }
  return { sector: 'السوق السعودي', sectorIcon: '📊' }
}

function hashStr(s: string): string {
  let h = 0
  for (let i = 0; i < Math.min(s.length, 50); i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return 'mw' + Math.abs(h).toString(36)
}

function timeAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1)  return 'الآن'
  if (m < 60) return `${m}د`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}س` : `${Math.floor(h / 24)}ي`
}

export default function AutoFeed({ onSelectNews }: { onSelectNews?: (text: string) => void }) {
  const [items, setItems]       = useState<FeedItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'pos' | 'neg' | 'neu'>('all')
  const [usingDemo, setUsingDemo] = useState(false)

  const loadNews = useCallback(async () => {
    setLoading(true)
    try {
      // يستخدم endpoint /api/news المُصلَح (Google News + أرقام الصحيح + بدائل)
      const resp = await fetch('/api/news', { signal: AbortSignal.timeout(12000) })
      if (resp.ok) {
        const data = await resp.json()
        if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
          const fetched: FeedItem[] = data.data.slice(0, 15).map((it: any) => {
            const title = (it.title || '').trim()
            const desc  = (it.desc  || '').trim().slice(0, 200)
            const { dir, score } = analyzeSentiment(title + ' ' + desc)
            const { sector, sectorIcon } = guessSector(title + ' ' + desc)
            return {
              id:         it.id || hashStr(title),
              title,
              desc,
              source:     it.source || 'مصدر',
              link:       it.link   || '',
              fetchedAt:  it.fetchedAt || Date.now(),
              dir, score,
              sector,
              sectorIcon: it.sourceIcon || sectorIcon,
              isNew:      true,
              isDemo:     false,
            }
          })
          setItems(fetched)
          setUsingDemo(false)
          setLoading(false)
          return
        }
      }
    } catch (err) {
      console.error('AutoFeed: failed to load real news', err)
    }

    // ─── Fallback إلى البيانات التجريبية مع تنبيه واضح ───
    setItems(DEMO_NEWS.map((d, i) => ({
      ...d,
      id:        hashStr(d.title + i),
      fetchedAt: Date.now() - i * 180000,
      isNew:     false,
      isDemo:    true,
    })))
    setUsingDemo(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadNews()
    const t = setInterval(loadNews, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [loadNews])

  const filtered = filter === 'all' ? items : items.filter(it => it.dir === filter)
  const negCount = items.filter(i => i.dir === 'neg').length
  const posCount = items.filter(i => i.dir === 'pos').length

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-b-1 bg-bg3">
        <div className="w-2 h-2 rounded-full bg-gr" style={{ boxShadow: '0 0 6px var(--gr)', animation: 'pulse 2s infinite' }} />
        <span className="text-sm font-bold">⚡ أخبار السوق — تحليل فوري</span>
        <span className="text-xs text-tx-3 mr-auto">{items.length} خبر</span>
        <button
          onClick={loadNews}
          disabled={loading}
          className="text-xs text-tx-3 border border-b-1 rounded px-2 py-1 hover:text-ac hover:border-ac transition-all disabled:opacity-50"
        >
          {loading ? '⏳ جارٍ…' : '↺ تحديث'}
        </button>
      </div>

      {/* تنبيه عند استخدام البيانات التجريبية */}
      {usingDemo && !loading && (
        <div
          className="px-4 py-2 border-b border-b-1 text-xs flex items-center gap-2"
          style={{ background: 'var(--yl2, #fef3c7)', color: 'var(--yl-dark, #92400e)' }}
        >
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <span>
            تعذّر الاتصال بمصادر الأخبار الحقيقية — يتم عرض <strong>بيانات تجريبية</strong> مؤقتاً.
            <button
              onClick={loadNews}
              style={{
                marginRight: '6px',
                textDecoration: 'underline',
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                font: 'inherit',
                padding: 0,
              }}
            >
              إعادة المحاولة
            </button>
          </span>
        </div>
      )}

      {/* Stats */}
      {!loading && items.length > 0 && (
        <div className="flex gap-3 px-4 py-2 border-b border-b-1 text-xs font-mono">
          <span className="text-tx-3">{items.length} خبر</span>
          <span className="text-rd">↓{negCount} سلبي</span>
          <span className="text-gr">↑{posCount} إيجابي</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-b-1">
        {(['all','pos','neg','neu'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
              filter === f
                ? 'bg-ac text-bg font-bold'
                : 'text-tx-3 hover:text-tx'
            }`}
          >
            {f === 'all' ? 'الكل' : f === 'pos' ? '📈 إيجابي' : f === 'neg' ? '📉 سلبي' : '➡️ محايد'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="divide-y divide-b1 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-tx-3 text-sm">
            <div className="text-2xl mb-2">⏳</div>
            جارٍ جلب الأخبار...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-tx-3 text-sm">لا توجد نتائج</div>
        ) : filtered.map(item => {
          const col  = item.dir === 'pos' ? 'var(--gr)' : item.dir === 'neg' ? 'var(--rd)' : 'var(--yl)'
          const icon = item.dir === 'pos' ? '📈'        : item.dir === 'neg' ? '📉'        : '➡️'
          return (
            <div
              key={item.id}
              className="flex gap-3 px-4 py-3 cursor-pointer hover:bg-bg3 transition-all"
              style={{ borderRight: `3px solid ${col}` }}
              onClick={() => onSelectNews?.(item.title + '. ' + item.desc)}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 mt-0.5"
                style={{
                  background: item.dir === 'pos' ? 'var(--gr2)' : item.dir === 'neg' ? 'var(--rd2)' : 'var(--bg4)',
                  border: `1px solid ${col}40`,
                }}
              >
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold leading-snug mb-1 line-clamp-2">{item.title}</div>
                <div className="flex items-center gap-2 text-xs text-tx-3 flex-wrap">
                  <span
                    className="border px-1.5 py-0.5 rounded text-xs"
                    style={{
                      background: item.isDemo ? 'var(--yl2, #fef3c7)' : 'var(--bg4)',
                      borderColor: item.isDemo ? 'var(--yl, #f59e0b)' : 'var(--b1)',
                      color: item.isDemo ? 'var(--yl-dark, #92400e)' : 'inherit',
                    }}
                  >
                    {item.source}
                  </span>
                  {item.sectorIcon && <span>{item.sectorIcon} {item.sector}</span>}
                  <span className="mr-auto font-mono">{timeAgo(item.fetchedAt)}</span>
                </div>
                <div className="mt-1.5 h-1 bg-bg3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(item.score, 100)}%`, background: col }} />
                </div>
              </div>
              <span className="font-mono text-sm font-bold shrink-0 self-center" style={{ color: col }}>
                {item.dir === 'pos' ? '+' : item.dir === 'neg' ? '-' : ''}{item.score}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
