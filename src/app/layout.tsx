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

/* viewport طبيعي — ندع التصميم المتجاوب يتولى الموبايل */
export const viewport: Viewport = {
  width:                  'device-width',
  initialScale:           1,
  maximumScale:           5,        // يسمح للمستخدم بتكبير المحتوى
  userScalable:           true,
  interactiveWidget:      'resizes-content',
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
          درع حماية ضد التمرير الأفقي على الموبايل:
          - أي عنصر يتمدد لأي سبب (نص بلا مسافات، رابط طويل، إلخ)
            سيُقَصّ بدلاً من جعل الصفحة كلها أعرض من الشاشة.
          - يُمنع overscroll-behavior الذي يسبب الاهتزاز الجانبي.
          - يُكسَر النص الطويل تلقائياً.
          ═══════════════════════════════════════════════════════════
        */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            max-width: 100vw;
            overflow-x: hidden;
            overscroll-behavior-x: none;
          }
          /* كسر النصوص الطويلة (روابط Base64 من Google News، إلخ) */
          p, span, div, a, h1, h2, h3, h4, h5, h6, li, td, th {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          /* صور وفيديوهات لا تتمدد أبداً */
          img, video, iframe, svg {
            max-width: 100%;
            height: auto;
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
