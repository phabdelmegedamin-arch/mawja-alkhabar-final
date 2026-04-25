'use client'
import OwnershipAccordion from './OwnershipAccordion'
import WaveAccordion from './WaveAccordion'
import type { AnalysisResult } from '@/types'

interface Props { result: AnalysisResult }

export default function NetworkImpactPanel({ result }: Props) {
  const hasOwnership = !!result.networkResult && !!result.originCode
  const hasWaves     = result.ripples.some(r => !r.isHead)

  if (!hasOwnership && !hasWaves) {
    return (
      <div
        className="text-center"
        style={{
          padding: '24px 28px',
          background: 'var(--cream-deep)',
          border: '1px dashed var(--ink)',
        }}
      >
        <div style={{
          fontFamily: 'var(--sans-lat)',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          marginBottom: '8px',
          color: 'var(--muted)',
        }}>
          NO NETWORK DATA
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
          لم نكتشف سهماً محدداً أو قطاعاً مرتبطاً في الخبر. جرّب ذكر اسم شركة أو رمز سهم لتفعيل تحليل الشبكة.
        </p>
      </div>
    )
  }

  /* عدّ الأسهم الكلي */
  const totalStocks = result.ripples.filter(r => !r.isHead).length

  return (
    <section style={{ padding: '32px 0 0' }}>

      {/* ═══ شبكة الملكية (إن وُجدت) ═══ */}
      {hasOwnership && <OwnershipAccordion result={result} />}

      {/* ═══ قسم الموجات ═══ */}
      {hasWaves && (
        <>
          <div style={{
            fontFamily: 'var(--sans-lat)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--muted)',
            letterSpacing: '0.2em',
            marginTop: hasOwnership ? '48px' : 0,
            marginBottom: '8px',
          }}>
            WAVE PROPAGATION
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
            <span>الأسهم المتأثرة بالخبر · 3 موجات</span>
            <span style={{
              fontFamily: 'var(--sans-lat)',
              fontSize: '12px',
              color: 'var(--muted)',
              fontWeight: 500,
              letterSpacing: '0.05em',
            }}>
              إجمالي{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {totalStocks} سهم
              </strong>
              {' '}متأثر
            </span>
          </div>

          <WaveAccordion result={result} wave={1} defaultOpen />
          <WaveAccordion result={result} wave={2} />
          <WaveAccordion result={result} wave={3} />
        </>
      )}
    </section>
  )
}
