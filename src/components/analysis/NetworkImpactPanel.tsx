'use client'
// ══════════════════════════════════════════════════════════════════
// المسار: src/components/analysis/NetworkImpactPanel.tsx
// الوصف: عرض نتائج محرك شبكة الملكية (الجديد)
// يعرض الأسهم المتأثرة مرتبةً حسب نسبة التأثير مع مسار الملكية
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
  1: 'ملكية مباشرة',
  2: 'ملكية غير مباشرة',
  3: 'علاقة تشغيلية',
  4: 'تأثير قطاعي',
}

const RELATION_ICONS: Record<string, string> = {
  ORIGIN:      '📌',
  DIRECT:      '🔗',
  INDIRECT:    '⛓️',
  OPERATIONAL: '🔧',
  SENTIMENT:   '📡',
}

function ImpactBar({ value, max }: { value: number; max: number }) {
  const pct    = max > 0 ? Math.abs(value) / max * 100 : 0
  const isPos  = value > 0
  const color  = isPos ? '#00D47A' : '#FF4757'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px', minWidth:'80px' }}>
      <div style={{
        flex:1, height:'6px', background:'var(--bg3)', borderRadius:'3px', overflow:'hidden',
      }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:'3px', transition:'width 0.3s' }} />
      </div>
      <span style={{
        fontFamily:'monospace', fontSize:'0.8rem', fontWeight:700, color,
        minWidth:'52px', textAlign:'right',
      }}>
        {value > 0 ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  )
}

function PathBadge({ path }: { path: string[] }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'3px', flexWrap:'wrap' }}>
      {path.map((code, i) => (
        <span key={code} style={{ display:'flex', alignItems:'center', gap:'3px' }}>
          <span style={{
            fontFamily:'monospace', fontSize:'0.68rem', fontWeight:700, color:'var(--ac)',
            background:'rgba(0,229,255,0.08)', padding:'1px 5px', borderRadius:'3px',
          }}>
            {code}
          </span>
          {i < path.length - 1 && (
            <span style={{ fontSize:'0.65rem', color:'var(--t2)' }}>→</span>
          )}
        </span>
      ))}
    </div>
  )
}

export default function NetworkImpactPanel({ result }: Props) {
  const { networkResult, originCode } = result
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterLayer, setFilterLayer] = useState<number | null>(null)

  // إذا لم يوجد نتيجة شبكة
  if (!networkResult || networkResult.impacts.length === 0) {
    if (!originCode) {
      return (
        <div style={{
          background:'var(--bg2)', border:'1px solid var(--b1)', borderRadius:'12px', padding:'16px',
        }}>
          <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--tx)', marginBottom:'8px' }}>
            🕸️ تحليل شبكة الملكية
          </div>
          <div style={{
            padding:'16px', textAlign:'center', background:'var(--bg3)',
            borderRadius:'8px', fontSize:'0.78rem', color:'var(--t2)',
          }}>
            <div style={{ fontSize:'1.5rem', marginBottom:'6px' }}>🔍</div>
            لم يتم كشف سهم محدد في الخبر
            <br />
            <span style={{ fontSize:'0.7rem' }}>أدخل اسم الشركة أو رمزها في الخبر لتفعيل تحليل الشبكة</span>
          </div>
        </div>
      )
    }
    return null
  }

  const { meta, impacts, warnings } = networkResult
  const maxAbs = Math.max(...impacts.map(i => Math.abs(i.impactPct)), 0.01)

  // فلترة حسب الطبقة
  const filtered = filterLayer !== null
    ? impacts.filter(i => i.layer === filterLayer)
    : impacts

  // إحصاءات
  const positives = impacts.filter(i => i.direction === 'POSITIVE').length
  const negatives = impacts.filter(i => i.direction === 'NEGATIVE').length
  const layers    = Array.from(new Set(impacts.map(i => i.layer))).sort()

  return (
    <div style={{
      background:'var(--bg2)', border:'1px solid var(--b1)', borderRadius:'12px', padding:'16px',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--tx)' }}>
            🕸️ تحليل شبكة الملكية
          </span>
          <span style={{
            fontSize:'0.68rem', padding:'2px 6px', borderRadius:'4px',
            background:'rgba(0,229,255,0.1)', color:'var(--ac)', fontWeight:600,
          }}>
            {impacts.length} سهم متأثر
          </span>
        </div>
        <div style={{ display:'flex', gap:'6px', fontSize:'0.7rem' }}>
          <span style={{ color:'#00D47A', fontWeight:700 }}>↑{positives}</span>
          <span style={{ color:'var(--t2)' }}>/</span>
          <span style={{ color:'#FF4757', fontWeight:700 }}>↓{negatives}</span>
        </div>
      </div>

      {/* Origin Stock Info */}
      <div style={{
        padding:'8px 12px', marginBottom:'10px',
        background:'rgba(0,229,255,0.06)', border:'1px solid rgba(0,229,255,0.2)',
        borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ fontSize:'0.78rem', color:'var(--t2)' }}>
          مصدر الخبر
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'0.78rem', color:'var(--tx)' }}>{meta.originStock.name}</span>
          <span style={{
            fontFamily:'monospace', fontSize:'0.8rem', fontWeight:700, color:'var(--ac)',
            background:'rgba(0,229,255,0.1)', padding:'2px 8px', borderRadius:'4px',
          }}>
            {meta.originStock.code}
          </span>
        </div>
      </div>

      {/* Parameters */}
      <div style={{
        display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px',
        fontSize:'0.7rem', color:'var(--t2)',
      }}>
        {[
          { k:'S', v:meta.parameters.S },
          { k:'M', v:meta.parameters.M },
          { k:'T', v:meta.parameters.T },
        ].map(p => (
          <span key={p.k} style={{
            padding:'2px 6px', borderRadius:'4px', background:'var(--bg3)',
            fontFamily:'monospace',
          }}>
            {p.k} = <span style={{ color:'var(--ac)', fontWeight:700 }}>{p.v}</span>
          </span>
        ))}
        <span style={{ padding:'2px 6px', borderRadius:'4px', background:'var(--bg3)' }}>
          {meta.parameters.marketState}
        </span>
      </div>

      {/* Layer Filter */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'10px', flexWrap:'wrap' }}>
        <button
          onClick={() => setFilterLayer(null)}
          style={{
            padding:'3px 8px', borderRadius:'6px', fontSize:'0.7rem', cursor:'pointer',
            border: filterLayer === null ? '1px solid rgba(0,229,255,0.5)' : '1px solid var(--b2)',
            background: filterLayer === null ? 'rgba(0,229,255,0.1)' : 'transparent',
            color: filterLayer === null ? 'var(--ac)' : 'var(--t2)',
          }}>
          الكل
        </button>
        {layers.map(l => (
          <button key={l}
            onClick={() => setFilterLayer(filterLayer === l ? null : l)}
            style={{
              padding:'3px 8px', borderRadius:'6px', fontSize:'0.7rem', cursor:'pointer',
              border: filterLayer === l ? `1px solid ${LAYER_COLORS[l]}80` : '1px solid var(--b2)',
              background: filterLayer === l ? `${LAYER_COLORS[l]}18` : 'transparent',
              color: filterLayer === l ? LAYER_COLORS[l] : 'var(--t2)',
            }}>
            {LAYER_LABELS[l] ?? `طبقة ${l}`}
          </button>
        ))}
      </div>

      {/* Impact List */}
      <div style={{ maxHeight:'400px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'4px' }}>
        {filtered.map(item => {
          const isExpanded = expanded === item.stockCode
          const layerColor = LAYER_COLORS[item.layer] ?? 'var(--t2)'

          return (
            <div key={item.stockCode}
              onClick={() => setExpanded(isExpanded ? null : item.stockCode)}
              style={{
                padding:'10px 12px', borderRadius:'8px', cursor:'pointer',
                background: isExpanded ? 'rgba(0,229,255,0.04)' : 'var(--bg3)',
                border: isExpanded ? '1px solid rgba(0,229,255,0.2)' : '1px solid var(--b2)',
                transition:'all 0.15s',
              }}>

              {/* Row Main */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>

                {/* Rank */}
                <span style={{
                  fontFamily:'monospace', fontSize:'0.65rem', color:'var(--t2)',
                  minWidth:'18px', textAlign:'center',
                }}>
                  {item.rank}
                </span>

                {/* Relation Icon + Layer Dot */}
                <span style={{ fontSize:'0.75rem' }}>{RELATION_ICONS[item.relationType] ?? '🔗'}</span>

                {/* Stock Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--tx)' }}>
                      {item.stockName}
                    </span>
                    <span style={{
                      fontFamily:'monospace', fontSize:'0.7rem', color:'var(--ac)',
                      background:'rgba(0,229,255,0.08)', padding:'1px 5px', borderRadius:'3px',
                    }}>
                      {item.stockCode}
                    </span>
                    <span style={{
                      fontSize:'0.65rem', padding:'1px 5px', borderRadius:'3px',
                      background:`${layerColor}18`, color:layerColor, fontWeight:600,
                    }}>
                      {LAYER_LABELS[item.layer] ?? `طبقة ${item.layer}`}
                    </span>
                  </div>
                  <div style={{ fontSize:'0.7rem', color:'var(--t2)', marginTop:'2px' }}>
                    {item.sector} • {item.timeframeLabel}
                    {item.ownershipPct && (
                      <span style={{ marginRight:'6px', color:'var(--ac)' }}>
                        {item.ownershipPct.toFixed(1)}% ملكية
                      </span>
                    )}
                  </div>
                </div>

                {/* Impact Bar */}
                <ImpactBar value={item.impactPct} max={maxAbs} />
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{
                  marginTop:'10px', paddingTop:'10px',
                  borderTop:'1px solid var(--b1)',
                  display:'flex', flexDirection:'column', gap:'6px',
                }}>
                  <div style={{ fontSize:'0.72rem', color:'var(--t2)' }}>
                    <span style={{ color:'var(--tx)', fontWeight:600 }}>مسار الملكية: </span>
                    <PathBadge path={item.path} />
                  </div>
                  <div style={{ fontSize:'0.72rem', color:'var(--t2)', fontFamily:'monospace', direction:'ltr', textAlign:'right' }}>
                    <span style={{ color:'var(--tx)', fontWeight:600, fontFamily:'Tajawal, sans-serif' }}>المعادلة: </span>
                    {item.formula}
                  </div>
                  <div style={{ fontSize:'0.72rem', color:'var(--t2)' }}>
                    <span style={{ color:'var(--tx)', fontWeight:600 }}>الملكية الفعلية: </span>
                    <span style={{ color:'var(--ac)', fontFamily:'monospace' }}>
                      {(item.effectiveOwn * 100).toFixed(2)}%
                    </span>
                    {' '}
                    <span style={{ color:'var(--t2)' }}>/ قوة الارتباط: {item.strength}/10</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{
          marginTop:'10px', padding:'8px 10px',
          background:'rgba(245,166,35,0.08)', border:'1px solid rgba(245,166,35,0.2)',
          borderRadius:'6px', fontSize:'0.7rem', color:'#F5A623',
        }}>
          {warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
        </div>
      )}

      {/* Footer stats */}
      <div style={{
        marginTop:'10px', paddingTop:'8px', borderTop:'1px solid var(--b1)',
        display:'flex', justifyContent:'space-between', fontSize:'0.68rem', color:'var(--t2)',
      }}>
        <span>معالجة: {meta.processingMs}ms</span>
        <span>المعادلة: Base×Own%×Decay×S×M×T×L</span>
      </div>
    </div>
  )
}
