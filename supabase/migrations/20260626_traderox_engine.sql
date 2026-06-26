alter table public.profiles
  add column if not exists traderox_enabled boolean not null default false,
  add column if not exists auto_sync_enabled boolean not null default false,
  add column if not exists is_verified boolean not null default false,
  add column if not exists plan text not null default 'free',
  add column if not exists premium_until timestamptz;

alter table public.trades
  add column if not exists external_deal_id text,
  add column if not exists risk_amount numeric,
  add column if not exists risk_percent numeric,
  add column if not exists rr numeric,
  add column if not exists setup_name text,
  add column if not exists session_name text;

create table if not exists public.traderox_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete set null,
  type text not null,
  severity text not null default 'info',
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.traderox_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.trading_accounts(id) on delete cascade,
  report_type text not null default 'daily',
  discipline_score numeric,
  stats jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists traderox_alerts_user_created_idx
  on public.traderox_alerts(user_id, created_at desc);

create index if not exists traderox_alerts_user_unread_idx
  on public.traderox_alerts(user_id, is_read, created_at desc);

create index if not exists traderox_reports_user_created_idx
  on public.traderox_reports(user_id, created_at desc);

create index if not exists trades_account_closed_analysis_idx
  on public.trades(account_id, closed_at desc, symbol, session_name);

alter table public.traderox_alerts enable row level security;
alter table public.traderox_reports enable row level security;

drop policy if exists "Users view own traderox alerts" on public.traderox_alerts;
create policy "Users view own traderox alerts"
  on public.traderox_alerts for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users update own traderox alerts" on public.traderox_alerts;
create policy "Users update own traderox alerts"
  on public.traderox_alerts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users view own traderox reports" on public.traderox_reports;
create policy "Users view own traderox reports"
  on public.traderox_reports for select to authenticated
  using ((select auth.uid()) = user_id);
