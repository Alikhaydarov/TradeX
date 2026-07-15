-- TradeWay platform maintenance: query paths used by the workspace and MT5 worker.
-- This migration is additive and safe to run against the existing production schema.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Keep mutable records consistent regardless of whether they are changed by the
-- application, an admin action, Stripe, or a connector worker.
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists prop_accounts_touch_updated_at on public.prop_accounts;
create trigger prop_accounts_touch_updated_at
  before update on public.prop_accounts
  for each row execute procedure public.touch_updated_at();

drop trigger if exists journal_entries_touch_updated_at on public.journal_entries;
create trigger journal_entries_touch_updated_at
  before update on public.journal_entries
  for each row execute procedure public.touch_updated_at();

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trading_accounts_touch_updated_at on public.trading_accounts;
create trigger trading_accounts_touch_updated_at
  before update on public.trading_accounts
  for each row execute procedure public.touch_updated_at();

drop trigger if exists mt5_sync_jobs_touch_updated_at on public.mt5_sync_jobs;
create trigger mt5_sync_jobs_touch_updated_at
  before update on public.mt5_sync_jobs
  for each row execute procedure public.touch_updated_at();

drop trigger if exists mt5_positions_touch_updated_at on public.mt5_positions;
create trigger mt5_positions_touch_updated_at
  before update on public.mt5_positions
  for each row execute procedure public.touch_updated_at();

-- Account-scoped journal reads are the main hot path for Dashboard, Calendar,
-- Trades and Analytics. This follows the API filter and ordering exactly.
create index if not exists journal_entries_user_account_date_idx
  on public.journal_entries (user_id, prop_account_id, traded_at desc, created_at desc);

create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, traded_at desc, created_at desc);

-- Social and notification queries use these relationships for profile/feed and
-- unread notification updates without scanning unrelated rows.
create index if not exists posts_user_created_idx
  on public.posts (user_id, created_at desc);

create index if not exists post_replies_user_created_idx
  on public.post_replies (user_id, created_at desc);

create index if not exists notifications_user_type_created_idx
  on public.notifications (user_id, type, created_at desc);

-- Recovery lookup for a connector job left in running state by a process crash.
create index if not exists mt5_sync_jobs_recovery_idx
  on public.mt5_sync_jobs (locked_until, updated_at)
  where status = 'running';

comment on function public.touch_updated_at() is
  'Maintains updated_at on TradeWay mutable records.';

