alter table public.trading_accounts
  add column if not exists last_error text;

alter table public.trading_accounts
  drop constraint if exists trading_accounts_platform_check;

alter table public.trades
  add column if not exists external_deal_id text,
  add column if not exists risk_amount numeric,
  add column if not exists risk_percent numeric,
  add column if not exists rr numeric,
  add column if not exists setup_name text,
  add column if not exists session_name text;

create index if not exists trades_account_external_deal_idx
  on public.trades(account_id, external_deal_id)
  where external_deal_id is not null;

create index if not exists trading_accounts_status_idx
  on public.trading_accounts(status, updated_at desc);

comment on column public.trading_accounts.broker_server is
  'MT5 server name such as Exness-MT5Trial15, or direct MTAPI host:port such as 47.91.105.29:443.';

comment on column public.trading_accounts.status is
  'pending, connected, error. MTAPI sync updates this after account history import.';
