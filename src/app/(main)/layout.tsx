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
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1320px',
          margin: '0 auto',
          padding: '0 48px 80px',
        }}
        className="px-3 sm:px-12"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
