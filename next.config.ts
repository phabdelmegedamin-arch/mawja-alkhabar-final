import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Arabic RTL + Bloomberg dark
  i18n: {
    locales:       ['ar', 'en'],
    defaultLocale: 'ar',
    localeDetection: false,
  },

  // تسريع الأداء
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-dialog'],
  },

  // CORS للـ API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },

  // Rewrites للـ Yahoo Finance proxy
  async rewrites() {
    return [
      {
        source: '/proxy/yahoo/:path*',
        destination: 'https://query1.finance.yahoo.com/:path*',
      },
    ]
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },

  // متغيرات البيئة المتاحة للـ client
  env: {
    NEXT_PUBLIC_APP_NAME: 'موجة الخبر',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
}

export default nextConfig
