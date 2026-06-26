alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists premium_until timestamptz,
  add column if not exists ai_enabled boolean not null default false,
  add column if not exists auto_sync_enabled boolean not null default false;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  status text,
  plan text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'MT5',
  broker_server text,
  account_login text,
  encrypted_password text,
  password_type text not null default 'investor',
  status text not null default 'pending',
  sync_mode text not null default 'normal',
  auto_sync_enabled boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.raw_trade_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  platform text,
  external_id text,
  unique_key text unique,
  payload jsonb,
  received_at timestamptz not null default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  platform text,
  external_position_id text,
  symbol text,
  side text,
  volume numeric,
  entry_price numeric,
  exit_price numeric,
  commission numeric default 0,
  swap numeric default 0,
  gross_pnl numeric,
  net_pnl numeric,
  opened_at timestamptz,
  closed_at timestamptz,
  status text not null default 'closed',
  unique_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.trading_accounts(id) on delete cascade,
  report_type text not null default 'daily',
  content text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions(user_id, created_at desc);
create index if not exists trading_accounts_user_idx on public.trading_accounts(user_id, created_at desc);
create index if not exists raw_trade_events_account_idx on public.raw_trade_events(account_id, received_at desc);
create index if not exists trades_account_closed_idx on public.trades(account_id, closed_at desc);
create index if not exists ai_reports_user_idx on public.ai_reports(user_id, created_at desc);

alter table public.subscriptions enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.raw_trade_events enable row level security;
alter table public.trades enable row level security;
alter table public.ai_reports enable row level security;

drop policy if exists "Users view own subscriptions" on public.subscriptions;
create policy "Users view own subscriptions"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users view own trading accounts" on public.trading_accounts;
create policy "Users view own trading accounts"
  on public.trading_accounts for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create own trading accounts" on public.trading_accounts;
create policy "Users create own trading accounts"
  on public.trading_accounts for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own trading accounts" on public.trading_accounts;
create policy "Users update own trading accounts"
  on public.trading_accounts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own trading accounts" on public.trading_accounts;
create policy "Users delete own trading accounts"
  on public.trading_accounts for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users view own raw trade events" on public.raw_trade_events;
create policy "Users view own raw trade events"
  on public.raw_trade_events for select to authenticated
  using (
    exists (
      select 1 from public.trading_accounts a
      where a.id = raw_trade_events.account_id
      and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users view own normalized trades" on public.trades;
create policy "Users view own normalized trades"
  on public.trades for select to authenticated
  using (
    exists (
      select 1 from public.trading_accounts a
      where a.id = trades.account_id
      and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users view own ai reports" on public.ai_reports;
create policy "Users view own ai reports"
  on public.ai_reports for select to authenticated
  using ((select auth.uid()) = user_id);

comment on column public.trading_accounts.encrypted_password is
  'Encrypted server-side connector credential. Never select this column in public client responses.';

revoke select (encrypted_password) on public.trading_accounts from anon, authenticated;
