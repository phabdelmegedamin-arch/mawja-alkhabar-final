'use client'
import { useState } from 'react'
import Accordion from '@/components/ui/Accordion'
import type { AnalysisResult, NetworkImpactItem } from '@/types'

interface Props { result: AnalysisResult }

export default function OwnershipAccordion({ result }: Props) {
  const { networkResult, originCode } = result

  if (!networkResult || !originCode) return null

  const { impacts } = networkResult

  // المالكون (UPWARD) — مرتّبون تنازلياً حسب نسبة الملكية
  const owners = impacts
    .filter(i => i.propagationDir === 'UPWARD' && i.ownershipPct !== null)
    .sort((a, b) => (b.ownershipPct ?? 0) - (a.ownershipPct ?? 0))

  if (owners.length === 0) return null

  const topOwner = owners[0]

  return (
    <Accordion
      accentColor="var(--tx)"
      badge={
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-[12px] font-semibold"
          style={{ background: 'var(--tx)', color: 'var(--bg)' }}
        >
          ⊕
        </div>
      }
      title="شبكة الملكية"
      subtitle={`${owners.length} مالك`}
      preview={
        <div className="flex items-center gap-2 text-[12px]">
          <span style={{ color: 'var(--t3)' }}>أكبر مالك:</span>
          <span className="font-medium" style={{ color: 'var(--tx)' }}>
            {topOwner.stockName}
          </span>
          <span
            className="mono-num font-semibold px-1.5 py-0.5 rounded"
            style={{ background: 'var(--ac2)', color: 'var(--ac)' }}
          >
            {topOwner.ownershipPct?.toFixed(1)}%
          </span>
        </div>
      }
    >
      <div className="p-4">
        <div
          className="text-[11px] mb-3 pb-2"
          style={{ color: 'var(--t3)', borderBottom: '1px solid var(--b1)' }}
        >
          جميع الشركات المالكة — مرتّبة تنازلياً حسب نسبة الملكية
        </div>

        <div className="space-y-1.5">
          {owners.map((owner, idx) => (
            <OwnerRow key={owner.stockCode} owner={owner} rank={idx + 1} />
          ))}
        </div>
      </div>
    </Accordion>
  )
}

function OwnerRow({ owner, rank }: { owner: NetworkImpactItem; rank: number }) {
  const [expanded, setExpanded] = useState(false)
  const pct = owner.ownershipPct ?? 0
  const barW = Math.min(100, pct)

  const relColor = owner.relationType === 'DIRECT'
    ? 'var(--gr)'
    : owner.relationType === 'INDIRECT'
    ? 'var(--yl)'
    : 'var(--t2)'

  const relLabel = owner.relationType === 'DIRECT'
    ? 'مباشر'
    : owner.relationType === 'INDIRECT'
    ? 'غير مباشر'
    : owner.relationType === 'OPERATIONAL'
    ? 'تشغيلي'
    : 'معنوي'

  return (
    <div
      className="rounded transition-colors"
      style={{
        background: expanded ? 'var(--bg3)' : 'transparent',
        border:     '1px solid ' + (expanded ? 'var(--b2)' : 'transparent'),
      }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-2.5 py-2 text-right hover:bg-[var(--bg3)] rounded transition-colors"
      >
        {/* Rank */}
        <span
          className="mono-num text-[10px] font-medium w-5 text-center shrink-0"
          style={{ color: 'var(--t3)' }}
        >
          {String(rank).padStart(2, '0')}
        </span>

        {/* Owner name + ticker */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span
            className="mono-num text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
            style={{ background: 'var(--ac2)', color: 'var(--ac)' }}
          >
            {owner.stockCode}
          </span>
          <span
            className="text-[13px] truncate"
            style={{ color: 'var(--tx)' }}
          >
            {owner.stockName}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
            style={{
              background: 'transparent',
              color:      relColor,
              border:     `1px solid ${relColor}40`,
            }}
          >
            {relLabel}
          </span>
        </div>

        {/* Ownership bar */}
        <div className="hidden sm:flex items-center gap-2 w-[140px] shrink-0">
          <div
            className="flex-1 h-[4px] rounded-full overflow-hidden"
            style={{ background: 'var(--b1)' }}
          >
            <div
              style={{
                width:      `${barW}%`,
                height:     '100%',
                background: 'var(--ac)',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <span
            className="mono-num text-[12px] font-semibold w-12 text-left"
            style={{ color: 'var(--ac)' }}
          >
            {pct.toFixed(1)}%
          </span>
        </div>

        {/* Mobile percentage */}
        <span
          className="sm:hidden mono-num text-[12px] font-semibold"
          style={{ color: 'var(--ac)' }}
        >
          {pct.toFixed(1)}%
        </span>

        {/* Chevron */}
        <span
          className="shrink-0 flex items-center justify-center w-4 h-4"
          style={{
            color:     'var(--t3)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition:'transform 0.2s',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 1.5 L6.5 5 L3 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div
          className="px-4 py-3 text-[12px] animate-fade-in"
          style={{ borderTop: '1px solid var(--b1)' }}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Detail label="القطاع" value={owner.sector} />
            <Detail label="نوع العلاقة" value={relLabel} color={relColor} />
            <Detail
              label="الطبقة"
              value={`طبقة ${owner.layer}`}
            />
            <Detail
              label="الملكية الفعلية"
              value={`${(owner.effectiveOwn * 100).toFixed(2)}%`}
              mono
            />
            <Detail
              label="قوة الارتباط"
              value={`${owner.strength}/10`}
              mono
            />
            <Detail
              label="الإطار الزمني"
              value={owner.timeframeLabel}
            />
          </div>

          {owner.path && owner.path.length > 1 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--b1)' }}>
              <div
                className="text-[10px] uppercase tracking-[0.12em] mb-1.5"
                style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
              >
                مسار الانتشار
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {owner.path.map((code, i) => (
                  <span key={`${code}-${i}`} className="flex items-center gap-1">
                    <span
                      className="mono-num text-[11px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--ac2)', color: 'var(--ac)' }}
                    >
                      {code}
                    </span>
                    {i < owner.path.length - 1 && (
                      <span style={{ color: 'var(--t3)', fontSize: '10px' }}>←</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Detail({
  label, value, color, mono,
}: {
  label: string
  value: string
  color?: string
  mono?: boolean
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.1em] mb-0.5"
        style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
      >
        {label}
      </div>
      <div
        className={`text-[12px] font-medium ${mono ? 'mono-num' : ''}`}
        style={{ color: color ?? 'var(--tx)' }}
      >
        {value}
      </div>
    </div>
  )
}
