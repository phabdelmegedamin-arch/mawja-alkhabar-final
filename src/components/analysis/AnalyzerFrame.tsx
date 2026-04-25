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
          <div style={{ borderLeft: '1px solid var(--ink)' }}>
            <NewsInput />
          </div>

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
