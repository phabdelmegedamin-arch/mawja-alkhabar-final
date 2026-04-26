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
  width:        'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
      <head>
        {/*
          ═══════════════════════════════════════════════════════════
          درع حماية ضد التمرير الأفقي — بدون كسر الكلمات العربية
          - الكسر يطبَّق فقط على عناصر معروفة بالنصوص الطويلة بلا مسافات
            (روابط، أكواد، base64) عبر الكلاس .break-anywhere
          - بقية الصفحة تستخدم word-break الطبيعي
          ═══════════════════════════════════════════════════════════
        */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            max-width: 100vw;
            overflow-x: hidden;
            overscroll-behavior-x: none;
          }
          /* لا نطبق word-break: break-word عالمياً — يكسر العربية */
          /* فقط للروابط والأكواد التي قد تحوي نصوصاً طويلة بلا مسافات */
          a, code, pre {
            overflow-wrap: break-word;
            word-break: break-word;
          }
          /* صور وفيديوهات لا تتمدد */
          img, video, iframe, svg {
            max-width: 100%;
            height: auto;
          }
          /* الجداول تتمرر أفقياً داخل حاويتها لا تكسر التخطيط */
          .table-scroll-wrap {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        `}} />
      </head>
      <body
        className="antialiased"
        style={{
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
