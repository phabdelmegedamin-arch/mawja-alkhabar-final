'use client'
import NewsInput from './NewsInput'
import SentimentCard from './SentimentCard'
import EmptyResult from './EmptyResult'
import LoadingResult from './LoadingResult'
import { useAnalysisStore } from '@/store/analysis'

/* ═══════════════════════════════════════════════════════
   إطار التحليل الكامل — مطابق لـ v7 HTML
   - حدود سوداء حول كل الإطار (.analyzer-frame)
   - شريط التبويبات في الأعلى
   - عمودين: إدخال (1fr) + نتيجة (380px)
   ═══════════════════════════════════════════════════════ */
export default function AnalyzerFrame() {
  const { result, isLoading } = useAnalysisStore()

  return (
    <section style={{ padding: '16px 0 0' }}>
      <div
        style={{
          border: '1px solid var(--ink)',
          background: 'var(--cream)',
        }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'minmax(0, 1fr) 380px',
          }}
        >
          {/* ═══ الجانب الأيمن: الإدخال ═══ */}
          <div style={{ borderLeft: '1px solid var(--ink)' }}>
            <NewsInput />
          </div>

          {/* ═══ الجانب الأيسر: النتيجة ═══ */}
          <div>
            {isLoading ? (
              <LoadingResult />
            ) : result ? (
              <SentimentCard result={result} />
            ) : (
              <EmptyResult />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
