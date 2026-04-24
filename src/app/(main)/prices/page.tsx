'use client'

/* ═══════════════════════════════════════════════
   صفحة الأسعار — Placeholder فارغ
   لم يتم الربط بعد بمصدر البيانات الحي
   لكنها تمنع ظهور 404 عند الضغط على تبويب "الأسعار"
   ═══════════════════════════════════════════════ */
export default function PricesPage() {
  return (
    <div
      className="min-h-[calc(100vh-200px)] flex items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      <div className="text-center" style={{ color: 'var(--t3)' }}>
        <div
          className="text-[11px] uppercase mb-3"
          style={{
            letterSpacing: '0.2em',
            fontFamily: 'var(--sans-lat)',
            color: 'var(--t3)',
          }}
        >
          PRICES
        </div>
        <div className="text-[16px]" style={{ color: 'var(--t2)' }}>
          الأسعار
        </div>
        <div className="text-[12px] mt-2" style={{ color: 'var(--t3)' }}>
          قيد التجهيز
        </div>
      </div>
    </div>
  )
}
