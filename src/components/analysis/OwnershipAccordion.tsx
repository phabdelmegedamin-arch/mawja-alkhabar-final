'use client'
import { useState } from 'react'
import type { AnalysisResult, NetworkImpactItem } from '@/types'

interface Props { result: AnalysisResult }

export default function OwnershipAccordion({ result }: Props) {
  const [open, setOpen] = useState(true)
  const { networkResult, originCode } = result

  if (!networkResult || !originCode) return null

  const { impacts } = networkResult

  /* ═══════════════════════════════════════════════════════
     فلسفة شبكة الملكية:
     - تظهر فقط الأسهم المدرجة المتملّكة في السهم المحوري
     - الكود = 4 أرقام (سهم مدرج)
     - استبعاد الكيانات الحكومية والصناديق غير المدرجة
       (PIF / GOSI / GPFF / SA / PUB / INS / FI / RT)
     - استبعاد السهم المحوري نفسه
     ═══════════════════════════════════════════════════════ */
  const owners = impacts
    .filter(i =>
      i.propagationDir === 'UPWARD' &&
      i.ownershipPct !== null &&
      /^\d{4}$/.test(i.stockCode) &&        // ✅ سهم مدرج فقط (4 أرقام)
      i.stockCode !== originCode             // ✅ استبعاد السهم نفسه
    )
    .sort((a, b) => (b.ownershipPct ?? 0) - (a.ownershipPct ?? 0))

  if (owners.length === 0) return null

  const topOwner = owners[0]
  const maxPct   = topOwner.ownershipPct ?? 100
  const originName = networkResult.meta.originStock.name

  return (
    <>
      {/* ═══ Section Eyebrow + Title ═══ */}
      <div style={{
        fontFamily: 'var(--sans-lat)',
        fontSize: '11px',
        fontWeight: 500,
        color: 'var(--muted)',
        letterSpacing: '0.2em',
        marginBottom: '8px',
      }}>
        OWNERSHIP NETWORK
      </div>

      <div
        className="flex items-end justify-between"
        style={{
          fontFamily: 'var(--sans)',
          fontSize: '22px',
          fontWeight: 500,
          color: 'var(--ink)',
          letterSpacing: '-0.015em',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--ink)',
        }}
      >
        <span>شبكة الملكية</span>
        <span style={{
          fontFamily: 'var(--sans-lat)',
          fontSize: '12px',
          color: 'var(--muted)',
          fontWeight: 500,
          letterSpacing: '0.05em',
        }}>
          السهم المحوري:{' '}
          <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>
            {originName} · {originCode}
          </strong>
        </span>
      </div>

      {/* ═══ Accordion ═══ */}
      <div
        style={{
          border: '1px solid var(--ink)',
          background: open ? 'var(--cream-soft)' : 'var(--cream)',
          marginBottom: '12px',
          transition: 'background 0.15s',
        }}
      >
        {/* ═══ Head ═══ */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full grid items-center"
          style={{
            padding: '20px 28px',
            background: 'transparent',
            border: 'none',
            gridTemplateColumns: 'auto 1fr auto auto',
            gap: '24px',
            cursor: 'pointer',
            fontFamily: 'var(--sans)',
            textAlign: 'right',
          }}
        >
          {/* Badge */}
          <div
            className="flex items-center justify-center"
            style={{
              width: '44px',
              height: '44px',
              background: 'var(--ink)',
              color: 'var(--cream)',
              fontFamily: 'var(--sans-lat)',
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >
            ◎
          </div>

          {/* Title */}
          <div className="flex flex-col" style={{ gap: '4px', textAlign: 'right' }}>
            <div style={{
              fontSize: '16px',
              fontWeight: 500,
              color: 'var(--ink)',
              letterSpacing: '-0.005em',
            }}>
              الأسهم المتملّكة في السهم المحوري
            </div>
            <div style={{
              fontFamily: 'var(--sans-lat)',
              fontSize: '10px',
              color: 'var(--muted)',
              letterSpacing: '0.12em',
            }}>
              {owners.length} {owners.length === 1 ? 'سهم مالك' : 'أسهم مالكة'} · مرتّبة تنازلياً بنسبة التملك
            </div>
          </div>

          {/* Preview: top owner */}
          <div
            className="flex items-center"
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
                أعلى ملكية
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
                  {topOwner.stockCode}
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--ink)',
                }}>
                  {topOwner.stockName}
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
                النسبة
              </div>
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--ink)',
                direction: 'ltr',
                display: 'inline-block',
              }}>
                {topOwner.ownershipPct?.toFixed(2)}%
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
            }}
          >
            <path d="M 3 5 L 7 9 L 11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* ═══ Body ═══ */}
        {open && (
          <div style={{ borderTop: '1px solid var(--ink)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {owners.map((owner, idx) => (
                  <OwnerRow key={owner.stockCode} owner={owner} rank={idx + 1} maxPct={maxPct} />
                ))}
              </tbody>
            </table>

            <div
              className="flex items-center justify-between"
              style={{
                padding: '14px 28px',
                background: 'var(--cream-deep)',
                borderTop: '1px solid var(--rule)',
                fontFamily: 'var(--sans-lat)',
                fontSize: '11px',
                color: 'var(--muted)',
                letterSpacing: '0.05em',
              }}
            >
              <span>
                قاعدة الربط:{' '}
                <strong style={{ color: 'var(--ink)' }}>أسهم مدرجة تملك في السهم المحوري</strong>
              </span>
              <span>
                إجمالي الأسهم المالكة ·{' '}
                <strong style={{ color: 'var(--ink)' }}>
                  {owners.length}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ═══ صف فردي في الجدول ═══ */
function OwnerRow({
  owner, rank, maxPct,
}: {
  owner: NetworkImpactItem
  rank:  number
  maxPct: number
}) {
  const [hover, setHover] = useState(false)
  const pct  = owner.ownershipPct ?? 0
  const barW = Math.max(2, Math.min(100, (pct / maxPct) * 100))

  return (
    <tr
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
        {owner.stockCode}
      </td>
      <td style={{ padding: '14px 28px', verticalAlign: 'middle' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--ink)',
          letterSpacing: '-0.005em',
        }}>
          {owner.stockName}
        </div>
        <div style={{
          fontFamily: 'var(--sans-lat)',
          fontSize: '10px',
          color: 'var(--muted)',
          marginTop: '2px',
          letterSpacing: '0.03em',
        }}>
          OWNER · LAYER {owner.layer}
        </div>
      </td>
      <td style={{ padding: '14px 28px', verticalAlign: 'middle', fontSize: '12px', color: 'var(--muted)', width: '120px' }}>
        {owner.sector}
      </td>
      <td style={{ padding: '14px 0', verticalAlign: 'middle', width: '200px' }}>
        <div style={{ height: '2px', background: 'var(--rule)' }}>
          <div style={{
            width: `${barW}%`,
            height: '100%',
            background: 'var(--amber)',
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
        color: 'var(--ink)',
        width: '90px',
        textAlign: 'left',
        direction: 'ltr',
      }}>
        {pct.toFixed(2)}%
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
