'use client'

export default function LoadingResult() {
  return (
    <aside
      className="flex flex-col items-center justify-center text-center h-full relative overflow-hidden"
      style={{
        padding: '40px 36px',
        background: 'var(--ink)',
        color: 'rgba(244, 239, 230, 0.56)',
        minHeight: '480px',
      }}
    >
      <div
        className="absolute"
        style={{
          top: '40px',
          right: '36px',
          width: '40px',
          height: '4px',
          background: 'var(--amber)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          className="animate-spin"
          style={{
            margin: '0 auto 24px',
            width: '36px',
            height: '36px',
            border: '2px solid rgba(244,239,230,0.12)',
            borderTopColor: '#F5B71C',
            borderRadius: '50%',
          }}
        />
        <div style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: '#F5B71C',
          fontFamily: 'var(--sans-lat)',
        }}>
          جارٍ القياس…
        </div>
        <div style={{
          fontSize: '11px',
          marginTop: '8px',
          color: 'rgba(244,239,230,0.40)',
        }}>
          تحليل + شبكة ملكية + 3 موجات
        </div>
      </div>
    </aside>
  )
}
