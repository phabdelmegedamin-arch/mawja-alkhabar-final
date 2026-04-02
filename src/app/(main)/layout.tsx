import Header   from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import TickerBar from '@/components/layout/TickerBar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <TickerBar />
      <main className="flex-1 main-content max-w-5xl mx-auto w-full px-3 md:px-6 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
