-- ══════════════════════════════════════════════════
-- موجة الخبر — Supabase Database Schema
-- Migration: 001_initial_schema
-- ══════════════════════════════════════════════════

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Profiles ──────────────────────────────────────
-- يُنشأ تلقائياً عند تسجيل مستخدم جديد
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique not null,
  name        text,
  phone       text,
  plan        text not null default 'free' check (plan in ('free','pro','admin')),
  plan_period text check (plan_period in ('monthly','yearly')),
  status      text not null default 'active' check (status in ('active','pending','expired','cancelled')),
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  last_login_at timestamptz
);

-- RLS
alter table public.profiles enable row level security;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles"
  on public.profiles for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.plan = 'admin'
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Subscriptions ─────────────────────────────────
create table public.subscriptions (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  plan        text not null check (plan in ('pro')),
  period      text not null check (period in ('monthly','yearly')),
  amount      numeric(10,2),
  vat         numeric(10,2),
  total       numeric(10,2),
  status      text not null default 'pending'
                check (status in ('pending','active','expired','refunded','failed')),
  payment_ref text,                    -- رقم مرجعي من ميسر
  payment_method text,
  starts_at   timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "Users can view own subscriptions"
  on public.subscriptions for select using (auth.uid() = user_id);
create policy "Admins can manage all subscriptions"
  on public.subscriptions for all using (
    exists (select 1 from public.profiles where id = auth.uid() and plan = 'admin')
  );

-- ── Subscription Codes ────────────────────────────
create table public.subscription_codes (
  code        text primary key,
  plan        text not null default 'pro',
  note        text,
  expiry      date,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz,
  used_by     uuid references public.profiles(id),
  created_by  uuid references public.profiles(id)
);
alter table public.subscription_codes enable row level security;
create policy "Only admins can manage codes"
  on public.subscription_codes for all using (
    exists (select 1 from public.profiles where id = auth.uid() and plan = 'admin')
  );
create policy "Users can redeem codes"
  on public.subscription_codes for select using (active = true);

-- ── Portfolio ─────────────────────────────────────
create table public.portfolio (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  ticker      text not null,
  name        text not null,
  qty         numeric(15,4) not null,
  avg_price   numeric(15,4) not null,
  sector      text,
  added_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, ticker)
);
alter table public.portfolio enable row level security;
create policy "Users can manage own portfolio"
  on public.portfolio for all using (auth.uid() = user_id);

-- ── Watchlist ─────────────────────────────────────
create table public.watchlist (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  ticker      text not null,
  name        text not null,
  added_at    timestamptz not null default now(),
  unique (user_id, ticker)
);
alter table public.watchlist enable row level security;
create policy "Users can manage own watchlist"
  on public.watchlist for all using (auth.uid() = user_id);

-- ── Analysis History ─────────────────────────────
create table public.analysis_history (
  id          bigserial primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  text_snippet text not null,           -- أول 300 حرف
  headline    text,
  sector      text,
  sentiment_dir text check (sentiment_dir in ('pos','neg','neu')),
  sentiment_score integer,
  confidence  integer,
  used_ai     boolean default false,
  market      text default 'SA',
  stocks_json jsonb,                    -- أبرز الأسهم
  keywords    text[],
  created_at  timestamptz not null default now()
);
alter table public.analysis_history enable row level security;
create policy "Users can manage own history"
  on public.analysis_history for all using (auth.uid() = user_id);
-- Admins
create policy "Admins can view all history"
  on public.analysis_history for select using (
    exists (select 1 from public.profiles where id = auth.uid() and plan = 'admin')
  );

-- Index للبحث السريع
create index idx_history_user_date on public.analysis_history (user_id, created_at desc);
create index idx_history_sector    on public.analysis_history (sector);

-- ── Admin Activity Log ───────────────────────────
create table public.admin_log (
  id         bigserial primary key,
  admin_id   uuid references public.profiles(id),
  action     text not null,
  target     text,
  details    jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_log enable row level security;
create policy "Only admins can view log"
  on public.admin_log for all using (
    exists (select 1 from public.profiles where id = auth.uid() and plan = 'admin')
  );

-- ── Updated_at trigger ────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();
create trigger set_portfolio_updated_at
  before update on public.portfolio
  for each row execute procedure public.set_updated_at();
