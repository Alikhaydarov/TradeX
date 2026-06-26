alter table public.trading_accounts
  add column if not exists last_error text;

create index if not exists trading_accounts_prop_platform_idx
  on public.trading_accounts(user_id, prop_account_id, platform);
