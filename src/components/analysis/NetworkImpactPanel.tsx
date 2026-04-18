'use client'
// ══════════════════════════════════════════════════════════════════
// المسار: src/components/analysis/NetworkImpactPanel.tsx
// ══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import type { AnalysisResult, NetworkImpactItem } from '@/types'

interface Props { result: AnalysisResult }

// ألوان الطبقات
const LAYER_COLORS: Record<number, string> = {
  0: 'var(--ac)',
  1: '#00D47A',
  2: '#F5A623',
  3: '#9B6EFF',
  4: '#FF6B6B',
}

const LAYER_LABELS: Record<number, string> = {
  0: 'مصدر الخبر',
  1: 'طبقة أولى',
  2: 'طبقة ثانية',
  3: 'علاقة تشغيلية',
  4: 'تأثير قطاعي',
}

const DIR_CONFIG = {
  UPWARD:   { icon: '↑', label: 'المالك يتأثر',  color: '#FF6B35', bg: 'rgba(255,107,53,0.1)',  desc: 'خسارة المملوك تنعكس على NAV المالك' },
  DOWNWARD: { icon: '↓', label: 'المملوك يتأثر', color: '#9B6EFF', bg: 'rgba(155,110,255,0.1)', desc: 'قرار المالك قد يؤثر على المملوك' },
  ORIGIN:   { icon: '📌', label: 'مصدر الخبر',   color: 'var(--ac)', bg: 'rgba(0,229,255,0.08)', desc: 'السهم المعني مباشرة بالخبر' },
}

const RELATION_ICONS: Record<string, string> = {
  ORIGIN:      '📌',
  DIRECT:      '🔗',
  INDIRECT:    '⛓️',
  OPERATIONAL: '🔧',
  SENTIMENT:   '📡',
}

// ── بطاقة السهم الأصلي — تعرض الاتجاه والنسبة بوضوح ─────────────
function OriginCard({ item }: { item: NetworkImpactItem }) {
  const isPos    = item.impactPct > 0
  const isNeg    = item.impactPct < 0
  const dirLabel = isPos ? 'إيجابي ▲' : isNeg ? 'سلبي ▼' : 'محايد ●'
  const dirColor = isPos ? '#00D47A' : isNeg ? '#FF4757' : '#F5A623'
  const dirBg    = isPos ? 'rgba(0,212,122,0.12)' : isNeg ? 'rgba(255,71,87,0.12)' : 'rgba(245,166,35,0.12)'

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '10px',
      background: 'rgba(0,229,255,0.06)',
      border: '1px solid rgba(0,229,255,0.3)',
      marginBottom: '16px',
    }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--t2)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>📌</span><span>السهم الأصلي — صاحب الخبر</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tx)' }}>{item.stockName}</span>
          <span style={{
            fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700,
            color: 'var(--ac)', background: 'rgba(0,229,255,0.1)',
            padding: '2px 8px', borderRadius: '4px',
          }}>{item.stockCode}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--t2)' }}>{item.sector}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: dirColor, fontFamily: 'monospace' }}>
            {isPos ? '+' : ''}{item.impactPct.toFixed(2)}%
          </span>
          <span style={{
            fontSize: '0.82rem', fontWeight: 700, color: dirColor,
            background: dirBg, padding: '4px 12px', borderRadius: '20px',
          }}>{dirLabel}</span>
        </div>
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--t2)', marginTop: '6px' }}>⏱ {item.timeframeLabel}</div>
    </div>
  )
}

function ImpactBar({ value, max }: { value: number; max: number }) {
  const pct   = max > 0 ? Math.abs(value) / max * 100 : 0
  const isPos = value > 0
  const color = isPos ? '#00D47A' : '#FF4757'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '80px' }}>
      <div style={{ flex: 1, height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color, minWidth: '52px', textAlign: 'right' }}>
        {value > 0 ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  )
}

function PathBadge({ path }: { path: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
      {path.map((code, i) => (
        <span key={`${code}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{
            fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 700, color: 'var(--ac)',
            background: 'rgba(0,229,255,0.08)', padding: '1px 5px', borderRadius: '3px',
          }}>
            {code}
          </span>
          {i < path.length - 1 && <span style={{ fontSize: '0.65rem', color: 'var(--t2)' }}>→</span>}
        </span>
      ))}
    </div>
  )
}

// ── مجموعة موجة واحدة ────────────────────────────────────────────
function WaveGroup({
  title, items, maxAbs, expanded, onToggle, dirKey,
}: {
  title:    string
  items:    NetworkImpactItem[]
  maxAbs:   number
  expanded: string | null
  onToggle: (code: string) => void
  dirKey:   'UPWARD' | 'DOWNWARD'
}) {
  const cfg = DIR_CONFIG[dirKey]
  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 10px', borderRadius: '6px',
        background: cfg.bg, marginBottom: '6px',
        borderRight: `3px solid ${cfg.color}`,
      }}>
        <span style={{ fontSize: '0.9rem' }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: cfg.color }}>{title}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--t2)', marginRight: '6px' }}>({cfg.desc})</span>
        </div>
        <span style={{
          fontSize: '0.68rem', padding: '1px 6px', borderRadius: '3px',
          background: cfg.bg, color: cfg.color, fontWeight: 700,
        }}>
          {items.length} سهم
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map(item => {
          const isExp      = expanded === item.stockCode
          const layerColor = LAYER_COLORS[item.layer] ?? 'var(--t2)'

          return (
            <div key={item.stockCode}
              onClick={() => onToggle(item.stockCode)}
              style={{
                padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                background: isExp ? 'rgba(0,229,255,0.04)' : 'var(--bg3)',
                border: isExp ? '1px solid rgba(0,229,255,0.2)' : '1px solid var(--b2)',
                transition: 'all 0.15s',
              }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--t2)', minWidth: '18px', textAlign: 'center' }}>
                  {item.rank}
                </span>
                <span style={{ fontSize: '0.75rem' }}>{RELATION_ICONS[item.relationType] ?? '🔗'}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--tx)' }}>
                      {item.stockName}
                    </span>
                    <span style={{
                      fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--ac)',
                      background: 'rgba(0,229,255,0.08)', padding: '1px 5px', borderRadius: '3px',
                    }}>
                      {item.stockCode}
                    </span>
                    <span style={{
                      fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px',
                      background: `${layerColor}18`, color: layerColor, fontWeight: 600,
                    }}>
                      {LAYER_LABELS[item.layer] ?? `طبقة ${item.layer}`}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--t2)', marginTop: '2px' }}>
                    {item.sector} • {item.timeframeLabel}
                    {item.ownershipPct && (
                      <span style={{ marginRight: '6px', color: cfg.color }}>
                        {item.ownershipPct.toFixed(1)}% ملكية
                      </span>
                    )}
                  </div>
                </div>

                <ImpactBar value={item.impactPct} max={maxAbs} />
              </div>

              {isExp && (
                <div style={{
                  marginTop: '10px', paddingTop: '10px',
                  borderTop: '1px solid var(--b1)',
                  display: 'flex', flexDirection: 'column', gap: '6px',
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--t2)' }}>
                    <span style={{ color: 'var(--tx)', fontWeight: 600 }}>مسار الانتشار: </span>
                    <PathBadge path={item.path} />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--t2)', fontFamily: 'monospace', direction: 'ltr', textAlign: 'right' }}>
                    <span style={{ color: 'var(--tx)', fontWeight: 600, fontFamily: 'Tajawal, sans-serif' }}>المعادلة: </span>
                    {item.formula}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--t2)' }}>
                    <span style={{ color: 'var(--tx)', fontWeight: 600 }}>الملكية الفعلية: </span>
                    <span style={{ color: 'var(--ac)', fontFamily: 'monospace' }}>
                      {(item.effectiveOwn * 100).toFixed(2)}%
                    </span>
                    <span style={{ marginRight: '8px', color: 'var(--t2)' }}>قوة الارتباط: {item.strength}/10</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function NetworkImpactPanel({ result }: Props) {
  const { networkResult, originCode } = result
  const [expanded, setExpanded]       = useState<string | null>(null)

  if (!networkResult || networkResult.impacts.length === 0) {
    if (!originCode) {
      return (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--tx)', marginBottom: '8px' }}>
            🕸️ تحليل شبكة الملكية
          </div>
          <div style={{
            padding: '16px', textAlign: 'center', background: 'var(--bg3)',
            borderRadius: '8px', fontSize: '0.78rem', color: 'var(--t2)',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🔍</div>
            لم يتم كشف سهم محدد في الخبر
            <br />
            <span style={{ fontSize: '0.7rem' }}>أدخل اسم الشركة أو رمزها في الخبر لتفعيل تحليل الشبكة</span>
          </div>
        </div>
      )
    }
    return null
  }

  const { meta, impacts, warnings } = networkResult

  // ── السهم الأصلي ─────────────────────────────────────────────
  const originItem    = impacts.find(i => (i as any).propagationDir === 'ORIGIN')
  const upwardItems   = impacts.filter(i => (i as any).propagationDir === 'UPWARD')
  const downwardItems = impacts.filter(i => (i as any).propagationDir === 'DOWNWARD')
  const unknownItems  = impacts.filter(i =>
    !(i as any).propagationDir || (i as any).propagationDir === 'ORIGIN'
  ).filter(i => i.rank > 1)

  const maxAbs = Math.max(...impacts.map(i => Math.abs(i.impactPct)), 0.01)

  const toggleExpanded = (code: string) =>
    setExpanded(prev => prev === code ? null : code)

  // فلتر التحذيرات — يُخفي S/M/T، يُظهر فقط ما يهم المستخدم
  const visibleWarnings = warnings.filter(w =>
    !w.includes('S تم') &&
    !w.includes('M = 1.0') &&
    !w.includes('T = 1.0') &&
    !w.includes('تصنيف الخبر غير مؤكد')
  )

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: '12px', padding: '16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--tx)' }}>
            🕸️ تحليل شبكة الملكية
          </span>
          <span style={{
            fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px',
            background: 'rgba(0,229,255,0.1)', color: 'var(--ac)', fontWeight: 600,
          }}>
            {impacts.length} سهم
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem' }}>
          {upwardItems.length > 0 && (
            <span style={{ color: DIR_CONFIG.UPWARD.color }}>↑ {upwardItems.length} مالك</span>
          )}
          {downwardItems.length > 0 && (
            <span style={{ color: DIR_CONFIG.DOWNWARD.color }}>↓ {downwardItems.length} مملوك</span>
          )}
        </div>
      </div>

      {/* ── السهم الأصلي — بطاقة كبيرة مميزة ── */}
      {originItem && <OriginCard item={originItem as any} />}

      {/* ── UPWARD: الأسهم التي يتأثر بها المالكون ── */}
      {upwardItems.length > 0 && (
        <WaveGroup
          title="المالكون المتأثرون — تأثير صاعد"
          items={upwardItems}
          maxAbs={maxAbs}
          expanded={expanded}
          onToggle={toggleExpanded}
          dirKey="UPWARD"
        />
      )}

      {/* ── DOWNWARD: الأسهم التي يتأثر بها المملوكون ── */}
      {downwardItems.length > 0 && (
        <WaveGroup
          title="المملوكون المتأثرون — تأثير نازل"
          items={downwardItems}
          maxAbs={maxAbs}
          expanded={expanded}
          onToggle={toggleExpanded}
          dirKey="DOWNWARD"
        />
      )}

      {/* ── Fallback للنسخ القديمة ── */}
      {unknownItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {unknownItems.map(item => (
            <div key={item.stockCode}
              onClick={() => toggleExpanded(item.stockCode)}
              style={{
                padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                background: 'var(--bg3)', border: '1px solid var(--b2)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--tx)' }}>{item.stockName}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--ac)' }}>{item.stockCode}</span>
                <ImpactBar value={item.impactPct} max={maxAbs} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Warnings — S/M/T مخفية، يظهر فقط ما يهم المستخدم ── */}
      {visibleWarnings.length > 0 && (
        <div style={{
          marginTop: '10px', padding: '8px 10px',
          background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)',
          borderRadius: '6px', fontSize: '0.7rem', color: '#F5A623',
        }}>
          {visibleWarnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--b1)',
        display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--t2)',
      }}>
        <span>{meta.processingMs}ms</span>
        <span>↑ صعود = تأثير أقوى | ↓ نزول = تأثير أضعف</span>
      </div>
    </div>
  )
}
