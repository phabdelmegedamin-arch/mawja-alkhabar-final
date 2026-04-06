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

// ✅ إصلاح 1: دعم الثيمين داكن وفاتح
export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0D1117' },
    { media: '(prefers-color-scheme: light)', color: '#F6F8FA' },
  ],
  colorScheme: 'dark light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className="antialiased"
        style={{
          // ✅ إصلاح 2: CSS variables بدل الألوان المشفرة
          background: 'var(--bg)',
          color:      'var(--tx)',
          minHeight:  '100dvh',
          fontFamily: "'Tajawal', 'Cairo', sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  )
}
