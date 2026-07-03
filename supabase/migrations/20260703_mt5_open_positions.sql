create table if not exists public.mt5_positions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prop_account_id uuid references public.prop_accounts(id) on delete set null,
  platform text not null default 'MT5',
  external_position_id text not null,
  symbol text not null,
  side text,
  volume numeric,
  entry_price numeric,
  current_price numeric,
  stop_loss numeric,
  take_profit numeric,
  unrealized_pnl numeric,
  realized_pnl numeric,
  opened_at timestamptz,
  closed_at timestamptz,
  status text not null default 'open',
  last_seen_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, external_position_id)
);

create index if not exists mt5_positions_account_status_idx
  on public.mt5_positions(account_id, status, opened_at desc);

create index if not exists mt5_positions_user_status_idx
  on public.mt5_positions(user_id, status, updated_at desc);

alter table public.mt5_positions enable row level security;

drop policy if exists "Users view own mt5 positions" on public.mt5_positions;
create policy "Users view own mt5 positions"
  on public.mt5_positions for select to authenticated
  using ((select auth.uid()) = user_id);
