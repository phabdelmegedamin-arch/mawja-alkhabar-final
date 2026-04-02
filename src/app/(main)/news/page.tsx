'use client'
import { useEffect } from 'react'
import NewsList from '@/components/news/NewsList'

export default function NewsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black">📡 أخبار السوق الحية</h1>
          <p className="text-xs text-tx-3 mt-0.5">تحليل فوري لكل خبر — تحديث كل 5 دقائق</p>
        </div>
      </div>
      <NewsList />
    </div>
  )
}
