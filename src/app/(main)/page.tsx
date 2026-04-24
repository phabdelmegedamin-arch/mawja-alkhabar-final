'use client'
import AnalyzerFrame from '@/components/analysis/AnalyzerFrame'
import NetworkImpactPanel from '@/components/analysis/NetworkImpactPanel'
import SessionBar from '@/components/layout/SessionBar'
import AutoFeed from '@/components/AutoFeed'
import { useAnalysisStore } from '@/store/analysis'

export default function HomePage() {
  const { result, error, isLoading, setInput } = useAnalysisStore()

  /* عند اختيار خبر من feed — نضعه في حقل الإدخال */
  const handleSelectNews = (text: string) => {
    setInput(text)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ background: 'var(--cream)' }}>
      {/* ═══ Session bar ═══ */}
      <SessionBar />

      {/* ═══ Analyzer Frame (Input + Result) ═══ */}
      <AnalyzerFrame />

      {/* Error display */}
      {error && !isLoading && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px 16px',
            background: 'var(--rd2)',
            color: 'var(--bear)',
            border: '1px solid rgba(198, 57, 57, 0.2)',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* ═══ Accordions (Ownership + 3 Waves) — show only if result ═══ */}
      {result && !isLoading && (
        <div className="animate-slide-up">
          <NetworkImpactPanel result={result} />
        </div>
      )}

      {/* ═══ Auto news feed ═══ */}
      <div style={{ marginTop: '32px', marginBottom: '40px' }}>
        <AutoFeed onSelectNews={handleSelectNews} />
      </div>
    </div>
  )
}
