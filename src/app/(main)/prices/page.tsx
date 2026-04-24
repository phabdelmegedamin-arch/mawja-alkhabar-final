'use client'

/* ═══════════════════════════════════════════════
   صفحة الأسعار — Placeholder فارغ مؤقت
   ═══════════════════════════════════════════════ */
export default function PricesPage() {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        minHeight: 'calc(100vh - 250px)',
        background: 'var(--cream)',
      }}
    >
      <div className="text-center">
        <div style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          marginBottom: '12px',
          color: 'var(--muted)',
          fontFamily: 'var(--sans-lat)',
        }}>
          PRICES
        </div>
        <div style={{ fontSize: '18px', color: 'var(--ink-soft)', marginBottom: '6px' }}>
          الأسعار
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          قيد التجهيز
        </div>
      </div>
    </div>
  )
}
