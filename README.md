# 🌊 موجة الخبر — Next.js

نظام تحليل ذكي للأخبار الاقتصادية وتأثيرها على السوق السعودي

## Stack

| التقنية | الاستخدام |
|---------|----------|
| **Next.js 14** | App Router, Server Components, API Routes |
| **Tailwind CSS** | Bloomberg Dark Theme |
| **Supabase** | Database, Auth, RLS |
| **Vercel** | Hosting, Edge Functions |
| **Claude API** | AI Analysis |
| **Zustand** | Client State |
| **Recharts** | Charts |

## هيكل المجلدات

```
src/
├── app/
│   ├── (main)/               ← Layout رئيسي مع Header + BottomNav
│   │   ├── page.tsx           ← / التحليل الرئيسي
│   │   ├── news/page.tsx      ← /news الأخبار الحية
│   │   ├── portfolio/page.tsx ← /portfolio المحفظة
│   │   ├── watchlist/page.tsx ← /watchlist المتابعة
│   │   └── history/page.tsx   ← /history السجل
│   ├── subscribe/page.tsx     ← /subscribe التسجيل والدفع
│   ├── admin/                 ← لوحة الأدمن (محمية)
│   │   ├── page.tsx           ← /admin الإحصائيات
│   │   ├── subscribers/       ← المشتركون
│   │   ├── stocks/            ← الأسهم
│   │   └── codes/             ← الأكواد
│   ├── api/
│   │   ├── analyze/route.ts   ← POST NLP + Claude
│   │   ├── news/route.ts      ← GET RSS proxy
│   │   ├── prices/route.ts    ← GET Yahoo Finance
│   │   ├── ai/route.ts        ← POST Claude direct
│   │   ├── auth/
│   │   │   ├── login/         ← POST Supabase login
│   │   │   ├── register/      ← POST تسجيل جديد
│   │   │   └── logout/        ← POST تسجيل خروج
│   │   ├── subscribers/       ← CRUD المشتركون
│   │   ├── codes/             ← CRUD الأكواد
│   │   ├── portfolio/         ← CRUD المحفظة
│   │   └── watchlist/         ← CRUD المتابعة
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx         ← الهيدر مع Badge
│   │   ├── BottomNav.tsx      ← موبايل navigation
│   │   └── TickerBar.tsx      ← شريط الأسعار
│   ├── analysis/
│   │   ├── NewsInput.tsx      ← خانة إدخال الخبر
│   │   ├── SentimentCard.tsx  ← نتيجة المشاعر
│   │   ├── RippleWaves.tsx    ← موجات التأثير
│   │   ├── StocksTable.tsx    ← جدول الأسهم
│   │   ├── TimelineChart.tsx  ← الخط الزمني
│   │   ├── SectorChart.tsx    ← توزيع القطاعات
│   │   └── SignalBar.tsx      ← شريط الإشارة
│   ├── admin/
│   │   ├── AdminLayout.tsx    ← Layout الأدمن
│   │   ├── StatsGrid.tsx      ← إحصائيات
│   │   ├── SubscribersTable.tsx
│   │   ├── CodesManager.tsx
│   │   └── StocksEditor.tsx
│   ├── news/
│   │   ├── NewsList.tsx
│   │   └── NewsItem.tsx
│   ├── portfolio/
│   │   ├── HoldingsTable.tsx
│   │   └── AllocationChart.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Badge.tsx
│       ├── Dialog.tsx
│       ├── Input.tsx
│       └── Skeleton.tsx
│
├── lib/
│   ├── nlp.ts         ← محرك NLP
│   ├── supabase.ts    ← Supabase clients
│   ├── auth.ts        ← Auth helpers
│   └── utils.ts       ← Utilities
│
├── hooks/
│   ├── useAuth.ts
│   ├── useAnalysis.ts
│   ├── usePortfolio.ts
│   └── useWatchlist.ts
│
├── store/
│   ├── analysis.ts    ← Zustand analysis state
│   ├── auth.ts        ← Auth state
│   └── ui.ts          ← UI state
│
├── types/
│   ├── index.ts       ← All TypeScript types
│   └── supabase.ts    ← Generated from Supabase
│
└── data/
    └── market-db.ts   ← DB + RELS (96 stocks, 12 sectors)

supabase/
└── migrations/
    └── 001_initial_schema.sql
```

## البدء السريع

```bash
# 1. تثبيت
npm install

# 2. متغيرات البيئة
cp .env.local.example .env.local
# أضف قيمك في .env.local

# 3. Supabase — تشغيل migrations
npx supabase db push

# 4. توليد TypeScript types من Supabase
npm run db:types

# 5. تشغيل التطوير
npm run dev
```

## Supabase Setup

1. أنشئ مشروع على [supabase.com](https://supabase.com)
2. اذهب لـ SQL Editor وشغّل `supabase/migrations/001_initial_schema.sql`
3. انسخ URL و Anon Key و Service Role Key إلى `.env.local`

## النشر على Vercel

```bash
# تثبيت Vercel CLI
npm i -g vercel

# نشر
vercel --prod
```

أضف متغيرات البيئة في Vercel Dashboard → Settings → Environment Variables

## الميزات

- ✅ تحليل NLP للأخبار العربية
- ✅ كشف القطاعات (12 قطاع، 96 سهم)
- ✅ موجات التأثير المتتابعة
- ✅ تحليل Claude AI
- ✅ أخبار RSS مباشرة
- ✅ أسعار مباشرة (Yahoo Finance)
- ✅ نظام اشتراكات مع ميسر
- ✅ لوحة أدمن كاملة
- ✅ محفظة استثمارية
- ✅ قائمة متابعة مع تنبيهات
- ✅ PWA + تثبيت على الجوال
