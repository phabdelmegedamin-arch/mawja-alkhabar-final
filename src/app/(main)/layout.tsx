import Header   from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import TickerBar from '@/components/layout/TickerBar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
    }}>
      <Header />
      <TickerBar />
      <main style={{
        flex: 1,
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '16px 16px 80px',
      }}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
