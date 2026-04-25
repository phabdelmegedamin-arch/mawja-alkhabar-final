'use client'
import NewsInput from './NewsInput'
import SentimentCard from './SentimentCard'
import EmptyResult from './EmptyResult'
import LoadingResult from './LoadingResult'
import { useAnalysisStore } from '@/store/analysis'

export default function AnalyzerFrame() {
  const { result, isLoading } = useAnalysisStore()

  return (
    <section style={{ padding: '16px 0 0' }}>
      {/* CSS responsive للموبايل: عمود واحد تحت الشاشات الصغيرة */}
      <style dangerouslySetInnerHTML={{ __html: `
        .analyzer-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 380px;
        }
        .analyzer-input-col {
          border-left: 1px solid var(--ink);
        }
        .analyzer-result-col { }

        /* ===== موبايل + تابلت ===== */
        @media (max-width: 900px) {
          .analyzer-grid {
            grid-template-columns: 1fr;
          }
          .analyzer-input-col {
            border-left: none;
            border-bottom: 1px solid var(--ink);
            order: 1;        /* أولاً: تبويبات الإدخال */
          }
          .analyzer-result-col {
            order: 2;        /* ثانياً: نتيجة التحليل */
          }
        }
      `}} />

      <div
        style={{
          border: '1px solid var(--ink)',
          background: 'var(--cream)',
        }}
      >
        <div className="analyzer-grid">
          <div className="analyzer-input-col">
            <NewsInput />
          </div>

          <div className="analyzer-result-col">
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
