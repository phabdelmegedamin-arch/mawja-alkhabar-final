'use client'
import { useEffect, useState } from 'react'
import { useAnalysisStore } from '@/store/analysis'

/* ═══════════════════════════════════════════════════════
   شريط الجلسة — مطابق لـ v7 HTML
   اليمين: آخر قراءة + تحليلات اليوم + دقة الأسبوع
   اليسار: GMT timestamp
   ═══════════════════════════════════════════════════════ */
export default function SessionBar() {
  const { history, result } = useAnalysisStore()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const int = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(int)
  }, [])

  /* عدد تحليلات اليوم */
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = history.filter(h => h.ts?.slice(0, 10) === today).length

  /* متوسط الثقة آخر 7 أيام */
  const weekAgo = Date.now() - 7 * 86400_000
  const recent  = history.filter(h => new Date(h.ts).getTime() > weekAgo)
  const avgConf = recent.length > 0
    ? Math.round(recent.reduce((s, h) => s + (h.confidence ?? 0), 0) / recent.length)
    : 0

  /* الوقت منذ آخر قراءة */
  let lastReadText = '—'
  if (result?.ts) {
    const diffMin = Math.floor((Date.now() - new Date(result.ts).getTime()) / 60_000)
    if (diffMin < 1) lastReadText = 'الآن'
    else if (diffMin === 1) lastReadText = 'دقيقة'
    else if (diffMin === 2) lastReadText = 'دقيقتين'
    else if (diffMin < 60) lastReadText = `${diffMin} دقيقة`
    else lastReadText = `${Math.floor(diffMin / 60)} ساعة`
  } else if (history.length > 0 && history[0].ts) {
    const diffMin = Math.floor((Date.now() - new Date(history[0].ts).getTime()) / 60_000)
    if (diffMin < 60) lastReadText = `${diffMin || 1} دقيقة`
    else lastReadText = `${Math.floor(diffMin / 60)} ساعة`
  }

  /* GMT timestamp */
  const gmtTime = now
    ? `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} GMT · ${
        now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase().replace(/\s/g, ' ').replace(/,/g, '').replace(/(\d+) (\w+) (\d+)/, '$2 $1, $3')
      }`
    : ''

  return (
    <div
      className="flex items-center justify-between flex-wrap"
      style={{
        padding: '18px 0',
        fontFamily: 'var(--sans-lat)',
        fontSize: '12px',
        color: 'var(--muted)',
      }}
    >
      <div className="flex" style={{ gap: '28px' }}>
        <Item>
          <Dot />
          <span>آخر قراءة قبل <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{lastReadText}</strong></span>
        </Item>
        <Item>
          <span>تحليلات اليوم · <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{todayCount}</strong></span>
        </Item>
        <Item>
          <span>دقة الأسبوع · <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{avgConf > 0 ? `${avgConf}%` : '—'}</strong></span>
        </Item>
      </div>

      <Item>
        <span style={{ fontFamily: 'var(--mono)' }}>{gmtTime}</span>
      </Item>
    </div>
  )
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center" style={{ gap: '8px' }}>
      {children}
    </div>
  )
}

function Dot() {
  return (
    <span style={{
      width: '4px',
      height: '4px',
      background: 'var(--muted)',
      borderRadius: '50%',
      display: 'inline-block',
    }} />
  )
}
