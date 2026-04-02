'use client'
import { cn, sentimentColor } from '@/lib/utils'
import type { AnalysisResult } from '@/types'

interface Props { result: AnalysisResult }

const WAVE_COLORS = { 1: 'var(--ac)', 2: 'var(--or)', 3: 'var(--gr)' }
const WAVE_LABELS = { 1: 'الموجة الأولى', 2: 'الموجة الثانية', 3: 'الموجة الثالثة' }
const WAVE_SUBS   = { 1: 'ساعات', 2: 'أيام', 3: 'أسابيع' }

export default function RippleWaves({ result }: Props) {
  const { ripples, sentiment } = result
  const abs = Math.abs(sentiment.score)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-tx-2">سلسلة الموجات التتابعية</h3>
        <span className="tag tag-ac text-2xs">
          {ripples.filter(r => r.isHead).length} موجات
        </span>
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
        {ripples.map((node, i) => {
          if (node.isHead) {
            const w     = node.wave as 1 | 2 | 3
            const color = WAVE_COLORS[w]
            const wPct  = Math.min(100, Math.round(abs * (w === 1 ? 1 : w === 2 ? 0.6 : 0.3)))
            return (
              <div
                key={i}
                className="flex items-center justify-between py-2 px-3 rounded-lg mt-2 first:mt-0"
                style={{ background: `${color}10`, borderRight: `3px solid ${color}` }}
              >
                <div>
                  <span className="text-xs font-bold" style={{ color }}>
                    {WAVE_LABELS[w]}
                  </span>
                  <span className="text-2xs text-tx-3 mr-2">({WAVE_SUBS[w]})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(d => (
                      <div
                        key={d}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: d <= (w === 1 ? 5 : w === 2 ? 3 : 2) ? color : 'var(--b2)' }}
                      />
                    ))}
                  </div>
                  <span className="text-2xs font-mono font-bold" style={{ color }}>
                    {wPct}%
                  </span>
                </div>
              </div>
            )
          }

          // Stock node
          const pv    = parseFloat(node.pct ?? '0')
          const isPos = pv > 0
          const color = isPos ? 'var(--gr)' : 'var(--rd)'

          return (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg
                                    hover:bg-bg3 transition-colors duration-150">
              {/* Wave icon */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center
                            text-sm shrink-0"
                style={{
                  background: WAVE_COLORS[node.wave as 1|2|3] + '15',
                  color:      WAVE_COLORS[node.wave as 1|2|3],
                }}
              >
                {node.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-tx truncate">
                  {node.n}
                  <span className="text-tx-3 font-normal font-mono text-2xs mr-1.5">
                    {node.t}
                  </span>
                </div>
                <div className="text-2xs text-tx-3 truncate">{node.desc}</div>
              </div>

              {/* Pct */}
              <div
                className="text-sm font-bold font-mono shrink-0"
                style={{ color }}
              >
                {node.pct}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
