import Header   from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import TickerBar from '@/components/layout/TickerBar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--cream)',
    }}>
      <Header />
      <TickerBar />

      {/* CSS متجاوب — حشوة جانبية أقل وحشوة سفلية أكبر على الموبايل (مكان BottomNav) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .main-wrap { padding: 0 48px 80px; }
        @media (max-width: 768px) {
          .main-wrap { padding: 0 14px 96px; }
        }
      `}} />

      <main
        className="main-wrap"
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1320px',
          margin: '0 auto',
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
