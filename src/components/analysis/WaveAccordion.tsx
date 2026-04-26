'use client'
import { useState } from 'react'
import type { AnalysisResult, RippleNode } from '@/types'

interface Props {
  result: AnalysisResult
  wave: 1 | 2 | 3
  defaultOpen?: boolean
}

const WAVE_META = {
  1: {
    title:     'الموجة الأولى · أثر مباشر',
    subtitle:  'DIRECT IMPACT · أسهم متأثرة مباشرة عبر علاقة تشغيلية',
    badge:     'W1',
    rule:      'علاقة تشغيلية مباشرة',
    badgeBg:   'var(--amber)',
    badgeColor:'var(--ink)',
  },
  2: {
    title:     'الموجة الثانية · أثر قطاعي',
    subtitle:  'SECTOR SPILLOVER · أسهم تشترك في نفس القطاع',
    badge:     'W2',
    rule:      'انتماء قطاعي مشترك',
    badgeBg:   'var(--amber-deep)',
    badgeColor:'var(--cream)',
  },
  3: {
    title:     'الموجة الثالثة · أثر سوقي عام',
    subtitle:  'MARKET SENTIMENT · أثر غير مباشر على مؤشرات السوق',
    badge:     'W3',
    rule:      'تحرّك مؤشرات السوق',
    badgeBg:   'var(--cream-deep)',
    badgeColor:'var(--ink)',
  },
} as const

export default function WaveAccordion({ result, wave, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const meta = WAVE_META[wave]
  const { ripples, sentiment, originCode } = result

  const stocks = ripples.filter(r =>
    !r.isHead &&
    r.wave === wave &&
    r.t !== originCode
  )

  if (stocks.length === 0) return null

  const sorted = [...stocks].sort((a, b) => Math.abs(b.pctVal ?? 0) - Math.abs(a.pctVal ?? 0))
  const top    = sorted[0]
  const maxAbs = Math.abs(top.pctVal ?? 1)

  const avgImpact = sorted.reduce((s, r) => s + (r.pctVal ?? 0), 0) / sorted.length
  const isPosWave = sentiment.dir === 'pos'

  const topPctText = (top.pctVal ?? 0) > 0
    ? `+${(top.pctVal ?? 0).toFixed(2)}%`
    : `${(top.pctVal ?? 0).toFixed(2)}%`

  return (
    <div
      className="wave-accordion"
      style={{
        border: '1px solid var(--ink)',
        background: open ? 'var(--cream-soft)' : 'var(--cream)',
        marginBottom: '12px',
        transition: 'background 0.15s',
      }}
    >
      {/* ═══════════════════════════════════════════════════
         CSS داخلي — تخطيط الديسكتوب يبقى كما هو، الموبايل يبسّط
         ═══════════════════════════════════════════════════ */}
      <style dangerouslySetInnerHTML={{ __html: `
        .wave-head {
          padding: 20px 28px;
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          gap: 24px;
          align-items: center;
        }
        .wave-preview { display: flex; }
        .wave-table-row-mobile { display: none; }
        .wave-table-row-desktop { display: table-row; }
        .wave-footer {
          padding: 14px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .wave-head {
            padding: 14px 14px;
            grid-template-columns: auto 1fr auto;  /* بدون preview */
            gap: 12px;
          }
          .wave-preview { display: none; }         /* preview مخفية على الموبايل */
          .wave-head-title { font-size: 14px !important; }
          .wave-head-sub   { font-size: 9px  !important; letter-spacing: 0.08em !important; }
          .wave-badge      { width: 36px !important; height: 36px !important; font-size: 11px !important; }

          /* الصف العادي للديسكتوب يخفى، نظهر صف الموبايل المبسط */
          .wave-table-row-desktop { display: none; }
          .wave-table-row-mobile  { display: block; padding: 12px 14px; border-bottom: 1px solid var(--rule); }

          .wave-footer { padding: 12px 14px; font-size: 10px !important; }
        }
      `}} />

      {/* ═══ Head ═══ */}
      <button
        onClick={() => setOpen(!open)}
        className="wave-head w-full"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
          textAlign: 'right',
        }}
      >
        {/* Badge */}
        <div
          className="wave-badge flex items-center justify-center"
          style={{
            width: '44px',
            height: '44px',
            background: meta.badgeBg,
            color: meta.badgeColor,
            fontFamily: 'var(--sans-lat)',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            flexShrink: 0,
            border: wave === 3 ? '1px solid var(--muted)' : 'none',
          }}
        >
          {meta.badge}
        </div>

        {/* Title */}
        <div className="flex flex-col" style={{ gap: '4px', textAlign: 'right', minWidth: 0 }}>
          <div
            className="wave-head-title"
            style={{
              fontSize: '16px',
              fontWeight: 500,
              color: 'var(--ink)',
              letterSpacing: '-0.005em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {meta.title}
          </div>
          <div
            className="wave-head-sub"
            style={{
              fontFamily: 'var(--sans-lat)',
              fontSize: '10px',
              color: 'var(--muted)',
              letterSpacing: '0.12em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {meta.subtitle}
          </div>
        </div>

        {/* Preview — مخفية على الموبايل */}
        <div
          className="wave-preview items-center"
          style={{
            gap: '14px',
            paddingRight: '24px',
            marginRight: '24px',
            borderRight: '1px solid var(--rule)',
          }}
        >
          <div>
            <div style={{
              fontFamily: 'var(--sans-lat)',
              fontSize: '10px',
              color: 'var(--muted)',
              letterSpacing: '0.12em',
              marginBottom: '3px',
            }}>
              الأعلى تأثراً
            </div>
            <div className="flex items-center" style={{ gap: '12px' }}>
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                color: 'var(--muted)',
                background: 'var(--cream)',
                padding: '3px 7px',
                border: '1px solid var(--rule)',
              }}>
                {top.t}
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--ink)',
              }}>
                {top.n}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: 'var(--sans-lat)',
              fontSize: '10px',
              color: 'var(--muted)',
              letterSpacing: '0.12em',
              marginBottom: '3px',
              textAlign: 'left',
            }}>
              التغير
            </div>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: '14px',
              fontWeight: 500,
              color: wave === 3 ? 'var(--ink)' : (isPosWave ? 'var(--bull)' : 'var(--bear)'),
              direction: 'ltr',
              display: 'inline-block',
            }}>
              {topPctText}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            color: 'var(--ink)',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        >
          <path d="M 3 5 L 7 9 L 11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* ═══ Body ═══ */}
      {open && (
        <div style={{ borderTop: '1px solid var(--ink)' }}>
          {/* صفوف الموبايل المبسطة */}
          <div>
            {sorted.map((r, idx) => (
              <MobileStockRow
                key={`m-${r.t}-${idx}`}
                stock={r}
                rank={idx + 1}
                maxAbs={maxAbs}
                wave={wave}
                isPosWave={isPosWave}
              />
            ))}
          </div>

          {/* جدول الديسكتوب — يخفى على الموبايل */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {sorted.map((r, idx) => (
                <DesktopStockRow
                  key={`d-${r.t}-${idx}`}
                  stock={r}
                  rank={idx + 1}
                  maxAbs={maxAbs}
                  wave={wave}
                  isPosWave={isPosWave}
                />
              ))}
            </tbody>
          </table>

          <div
            className="wave-footer"
            style={{
              background: 'var(--cream-deep)',
              borderTop: '1px solid var(--rule)',
              fontFamily: 'var(--sans-lat)',
              fontSize: '11px',
              color: 'var(--muted)',
              letterSpacing: '0.05em',
            }}
          >
            <span>
              {sorted.length} أسهم · متوسط التأثر{' '}
              <strong style={{
                color: wave === 3 ? 'var(--muted)' : (isPosWave ? 'var(--bull)' : 'var(--bear)'),
              }}>
                {avgImpact > 0 ? '+' : ''}{avgImpact.toFixed(2)}%
              </strong>
            </span>
            <span>
              قاعدة الربط: <strong style={{ color: 'var(--ink)' }}>{meta.rule}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══ صف الموبايل (مبسط) ═══ */
function MobileStockRow({
  stock, rank, maxAbs, wave, isPosWave,
}: {
  stock: RippleNode
  rank:  number
  maxAbs: number
  wave: 1 | 2 | 3
  isPosWave: boolean
}) {
  const pctVal = stock.pctVal ?? 0
  const barW   = Math.max(2, Math.min(100, (Math.abs(pctVal) / maxAbs) * 100))
  const barColor = wave === 1 ? 'var(--amber)' : wave === 2 ? 'var(--amber-deep)' : 'var(--muted)'
  const valColor = wave === 3 ? 'var(--muted)' : (pctVal > 0 ? 'var(--bull)' : 'var(--bear)')

  return (
    <div
      className="wave-table-row-mobile"
      style={{ display: 'none' }}
    >
      <div className="flex items-center justify-between" style={{ gap: '10px', marginBottom: '6px' }}>
        <div className="flex items-center" style={{ gap: '8px', minWidth: 0, flex: 1 }}>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            color: 'var(--muted)',
            flexShrink: 0,
          }}>
            {String(rank).padStart(2, '0')}
          </span>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: 'var(--ink)',
            fontWeight: 500,
            flexShrink: 0,
          }}>
            {stock.t}
          </span>
          <span style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {stock.n}
          </span>
        </div>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: '13px',
          fontWeight: 500,
          color: valColor,
          direction: 'ltr',
          flexShrink: 0,
        }}>
          {pctVal > 0 ? '+' : ''}{pctVal.toFixed(2)}%
        </span>
      </div>
      <div style={{ height: '2px', background: 'var(--rule)' }}>
        <div style={{
          width: `${barW}%`,
          height: '100%',
          background: barColor,
          opacity: wave === 3 ? 0.5 : 1,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

/* ═══ صف الديسكتوب الكامل (الأصلي) ═══ */
function DesktopStockRow({
  stock, rank, maxAbs, wave, isPosWave,
}: {
  stock: RippleNode
  rank:  number
  maxAbs: number
  wave: 1 | 2 | 3
  isPosWave: boolean
}) {
  const [hover, setHover] = useState(false)
  const pctVal = stock.pctVal ?? 0
  const barW   = Math.max(2, Math.min(100, (Math.abs(pctVal) / maxAbs) * 100))

  const barColor = wave === 1 ? 'var(--amber)' : wave === 2 ? 'var(--amber-deep)' : 'var(--muted)'
  const valColor = wave === 3 ? 'var(--muted)' : (pctVal > 0 ? 'var(--bull)' : 'var(--bear)')

  return (
    <tr
      className="wave-table-row-desktop"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderBottom: '1px solid var(--rule)',
        background: hover ? 'var(--cream)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <td style={{ padding: '14px 28px', verticalAlign: 'middle', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)', width: '36px' }}>
        {String(rank).padStart(2, '0')}
      </td>
      <td style={{ padding: '14px 28px', verticalAlign: 'middle', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink)', fontWeight: 500, width: '60px' }}>
        {stock.t}
      </td>
      <td style={{ padding: '14px 28px', verticalAlign: 'middle' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--ink)',
          letterSpacing: '-0.005em',
        }}>
          {stock.n}
        </div>
        {stock.s && (
          <div style={{
            fontFamily: 'var(--sans-lat)',
            fontSize: '10px',
            color: 'var(--muted)',
            marginTop: '2px',
            letterSpacing: '0.03em',
          }}>
            {stock.s}
          </div>
        )}
      </td>
      <td style={{ padding: '14px 28px', verticalAlign: 'middle', fontSize: '12px', color: 'var(--muted)', width: '120px' }}>
        {stock.desc ?? '—'}
      </td>
      <td style={{ padding: '14px 0', verticalAlign: 'middle', width: '200px' }}>
        <div style={{ height: '2px', background: 'var(--rule)' }}>
          <div style={{
            width: `${barW}%`,
            height: '100%',
            background: barColor,
            opacity: wave === 3 ? 0.5 : 1,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </td>
      <td style={{
        padding: '14px 28px',
        verticalAlign: 'middle',
        fontFamily: 'var(--mono)',
        fontSize: '14px',
        fontWeight: 500,
        color: valColor,
        width: '90px',
        textAlign: 'left',
        direction: 'ltr',
      }}>
        {pctVal > 0 ? '+' : ''}{pctVal.toFixed(2)}%
      </td>
      <td style={{
        padding: '14px 28px',
        verticalAlign: 'middle',
        width: '20px',
        color: 'var(--ink)',
        opacity: hover ? 1 : 0,
        textAlign: 'left',
        fontSize: '13px',
        transition: 'all 0.2s',
        transform: hover ? 'translateX(-4px)' : 'translateX(0)',
      }}>
        ←
      </td>
    </tr>
  )
}
