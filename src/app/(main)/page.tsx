'use client'
import NewsInput     from '@/components/analysis/NewsInput'
import SentimentCard from '@/components/analysis/SentimentCard'
import RippleWaves   from '@/components/analysis/RippleWaves'
import SignalBar     from '@/components/analysis/SignalBar'
import { useAnalysisStore } from '@/store/analysis'

export default function HomePage() {
  const { result, isLoading, error } = useAnalysisStore()

  return (
    <div className="space-y-4">
      {/* Input */}
      <NewsInput />

      {/* Error */}
      {error && (
        <div className="card p-3 border-rd bg-rd2 text-rd text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Empty state */}
      {!result && !isLoading && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📡</div>
          <div className="text-lg font-bold text-tx-2 mb-2">جاهز للتحليل</div>
          <div className="text-sm text-tx-3 max-w-md mx-auto">
            أدخل أي خبر اقتصادي وسيحدد النظام القطاعات المتأثرة
            ويبني سلسلة موجات تتابعية كاملة للأسهم السعودية
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Signal Bar */}
          <SignalBar result={result} />

          {/* AI Insight */}
          {result.insight && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-ac text-sm font-bold">⚡ تحليل الذكاء الاصطناعي</span>
                <span className="tag tag-ac text-2xs">Claude</span>
              </div>
              <p className="text-sm text-tx-2 leading-relaxed">{result.insight}</p>
            </div>
          )}

          {/* 3-column grid */}
          <div className="grid md:grid-cols-3 gap-4">
            <SentimentCard result={result} />
            <RippleWaves   result={result} />

            {/* Stocks panel */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-tx-2">الأسهم المتأثرة</h3>
                <span className="tag tag-ac text-2xs">{result.stocks.length} سهم</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {result.stocks.map((s, i) => {
                  const pv    = parseFloat(s.pct ?? '0')
                  const color = pv > 0 ? 'var(--gr)' : pv < 0 ? 'var(--rd)' : 'var(--t2)'
                  return (
                    <div key={i} className="flex items-center justify-between
                                             py-1.5 border-b border-b-1 last:border-0">
                      <div>
                        <span className="font-mono text-ac text-xs font-bold">{s.t}</span>
                        <span className="text-tx-2 text-xs mr-2">{s.n}</span>
                      </div>
                      <span className="font-mono text-sm font-bold" style={{ color }}>
                        {s.pct}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card p-4">
            <h3 className="text-sm font-bold text-tx-2 mb-3">التوقع الزمني للتأثير</h3>
            <div className="flex items-end gap-2 overflow-x-auto pb-2">
              {result.timeline.map((pt, i) => {
                const color = pt.v > 0 ? 'var(--gr)' : pt.v < 0 ? 'var(--rd)' : 'var(--yl)'
                return (
                  <div key={i} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <span className="font-mono text-xs font-bold" style={{ color }}>
                      {pt.v > 0 ? '+' : ''}{pt.v}%
                    </span>
                    <div className="w-full h-1.5 bg-bg3 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width:      `${Math.abs(pt.v) / 50 * 100}%`,
                          background: color,
                        }}
                      />
                    </div>
                    <span className="text-2xs text-tx-3 font-mono">{pt.l}</span>
                    {pt.active && <div className="w-1.5 h-1.5 rounded-full bg-ac" />}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
