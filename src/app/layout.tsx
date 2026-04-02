import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'موجة الخبر — تحليل الأسواق السعودية',
  description: 'نظام تحليل ذكي للأخبار الاقتصادية وتأثيرها على السوق السعودي',
  keywords:    ['تداول', 'أسهم', 'السوق السعودي', 'تحليل', 'NLP', 'موجة الخبر'],
  authors:     [{ name: 'موجة الخبر' }],
  manifest:    '/manifest.json',
  icons: {
    icon:  '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title:       'موجة الخبر',
    description: 'تحليل الأخبار الاقتصادية وموجات تأثيرها على السوق السعودي',
    locale:      'ar_SA',
    type:        'website',
  },
}

export const viewport: Viewport = {
  width:                 'device-width',
  initialScale:          1,
  themeColor:            '#0D1117',
  colorScheme:           'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
