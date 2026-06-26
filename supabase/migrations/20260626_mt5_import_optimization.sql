alter table public.trading_accounts
  add column if not exists prop_account_id uuid references public.prop_accounts(id) on delete set null;

alter table public.journal_entries
  add column if not exists external_source text,
  add column if not exists external_id text;

create unique index if not exists trading_accounts_user_platform_login_unique
  on public.trading_accounts(user_id, platform, broker_server, account_login);

create index if not exists trading_accounts_user_prop_idx
  on public.trading_accounts(user_id, prop_account_id);

create index if not exists trading_accounts_sync_queue_idx
  on public.trading_accounts(status, auto_sync_enabled, last_synced_at desc)
  where auto_sync_enabled = true;

create index if not exists trades_account_closed_idx
  on public.trades(account_id, closed_at desc, created_at desc);

create index if not exists trades_account_symbol_idx
  on public.trades(account_id, symbol, closed_at desc);

create index if not exists raw_trade_events_account_received_idx
  on public.raw_trade_events(account_id, received_at desc);

create unique index if not exists journal_entries_external_unique
  on public.journal_entries(user_id, external_source, external_id)
  where external_source is not null and external_id is not null;

create index if not exists journal_entries_user_external_idx
  on public.journal_entries(user_id, external_source, traded_at desc)
  where external_source is not null;
