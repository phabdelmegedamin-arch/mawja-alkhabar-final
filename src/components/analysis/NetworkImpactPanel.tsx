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
        className="card p-6 text-center"
        style={{ background: 'var(--bg3)' }}
      >
        <div
          className="text-[11px] uppercase tracking-[0.15em] mb-2"
          style={{ color: 'var(--t3)', fontFamily: 'var(--sans-lat)' }}
        >
          لا توجد موجات
        </div>
        <p className="text-[13px]" style={{ color: 'var(--t2)' }}>
          لم نكتشف سهماً محدداً أو قطاعاً مرتبطاً في الخبر.
          <br />
          <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
            جرّب ذكر اسم شركة أو رمز سهم لتفعيل تحليل الشبكة.
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 1. شبكة الملكية (إن وُجدت) */}
      {hasOwnership && <OwnershipAccordion result={result} />}

      {/* 2. الموجة الأولى — مفتوحة افتراضياً */}
      <WaveAccordion result={result} wave={1} defaultOpen />

      {/* 3. الموجة الثانية */}
      <WaveAccordion result={result} wave={2} />

      {/* 4. الموجة الثالثة */}
      <WaveAccordion result={result} wave={3} />
    </div>
  )
}
