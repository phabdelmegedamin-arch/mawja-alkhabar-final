'use client'

export default function EmptyResult() {
  return (
    <aside
      className="empty-result flex flex-col items-center justify-center text-center h-full relative overflow-hidden"
      style={{
        padding: '40px 36px',
        background: 'var(--ink)',
        color: 'rgba(244, 239, 230, 0.56)',
        minHeight: '480px',
      }}
    >
      {/* CSS متجاوب — تقليل الارتفاع والحشوة على الموبايل */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) {
          .empty-result { min-height: 260px !important; padding: 28px 20px !important; }
          .empty-result .er-icon  { width: 44px; height: 44px; }
          .empty-result .er-title { font-size: 16px !important; }
          .empty-result .er-desc  { font-size: 12px !important; max-width: 220px !important; }
        }
      `}} />

      <div
        className="absolute"
        style={{
          top: '24px',
          right: '24px',
          width: '40px',
          height: '4px',
          background: 'var(--amber)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-180px',
          left: '-120px',
          width: '340px',
          height: '340px',
          border: '1px solid rgba(244, 239, 230, 0.05)',
          borderRadius: '50%',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '20px', color: 'rgba(244, 239, 230, 0.20)' }}>
          <svg className="er-icon" width="60" height="60" viewBox="0 0 60 60" fill="none">
            <circle cx="14" cy="30" r="4" fill="#F5B71C" />
            <path d="M 22 30 Q 30 18, 38 30 T 54 30" stroke="rgba(244,239,230,0.25)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 22 30 Q 30 22, 38 30 T 54 30" stroke="rgba(244,239,230,0.5)"  strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 22 30 Q 30 26, 38 30 T 54 30" stroke="rgba(244,239,230,0.85)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        <div style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          marginBottom: '8px',
          color: '#F5B71C',
          fontFamily: 'var(--sans-lat)',
        }}>
          جاهز للقياس
        </div>

        <h3 className="er-title" style={{
          fontSize: '18px',
          fontWeight: 500,
          marginBottom: '10px',
          color: '#F4EFE6',
        }}>
          أدخل خبراً لقياس اتجاهه
        </h3>

        <p className="er-desc" style={{
          fontSize: '12.5px',
          maxWidth: '260px',
          lineHeight: 1.7,
          marginBottom: '20px',
        }}>
          ستظهر هنا: الاتجاه العام، القطاع، نسبة الثقة، والأسهم المتأثرة
        </p>

        <div
          className="flex items-center justify-center flex-wrap"
          style={{
            gap: '10px',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(244,239,230,0.35)',
            fontFamily: 'var(--sans-lat)',
          }}
        >
          <span>← قياس فوري</span>
          <span>·</span>
          <span>شبكة ملكية</span>
          <span>·</span>
          <span>3 موجات</span>
        </div>
      </div>
    </aside>
  )
}
