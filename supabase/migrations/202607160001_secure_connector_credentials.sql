-- TradeWay connector credential boundary
--
-- MT5 investor passwords are encrypted at rest, but encrypted secrets are still
-- sensitive. Browser clients must never be able to select this column. Trusted
-- server routes and connector workers use the service-role client instead.

revoke all on table public.trading_accounts from anon;
revoke select on table public.trading_accounts from authenticated;

grant select (
  id,
  user_id,
  prop_account_id,
  platform,
  broker_server,
  account_login,
  password_type,
  status,
  sync_mode,
  auto_sync_enabled,
  last_synced_at,
  last_error,
  created_at,
  updated_at
) on table public.trading_accounts to authenticated;

comment on column public.trading_accounts.encrypted_password is
  'Server-only encrypted MT5 investor password. Never expose through PostgREST.';
