'use client'
import HoldingsTable from '@/components/portfolio/HoldingsTable'

export default function PortfolioPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black">💼 محفظتي الاستثمارية</h1>
        <p className="text-xs text-tx-3 mt-0.5">تتبع أسهمك مع تأثير الأخبار الفوري</p>
      </div>
      <HoldingsTable />
    </div>
  )
}
