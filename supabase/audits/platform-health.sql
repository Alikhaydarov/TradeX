-- TradeWay Supabase health audit
-- Read-only queries. Run these in the Supabase SQL Editor after each deployment.

-- 1. Tables in the public schema that do not have RLS enabled.
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by c.relname;

-- 2. Foreign keys without a matching leading index. Review each row before adding an index.
select
  conrelid::regclass as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f'
  and connamespace = 'public'::regnamespace
  and not exists (
    select 1
    from pg_index i
    where i.indrelid = conrelid
      and i.indisvalid
      and i.indkey::smallint[] @> conkey
  )
order by table_name::text, constraint_name;

-- 3. Plan integrity: only free, standard, and pro are valid production plans.
select coalesce(plan, 'null') as plan, count(*) as users
from public.profiles
group by coalesce(plan, 'null')
order by users desc;

-- 4. Connector queue health. A growing queued count needs worker attention.
select
  status,
  count(*) as jobs,
  min(created_at) as oldest_job,
  max(updated_at) as latest_update
from public.mt5_sync_jobs
group by status
order by status;

-- 5. MT5 accounts needing operational attention.
select
  status,
  count(*) as accounts,
  min(last_synced_at) as oldest_sync
from public.trading_accounts
group by status
order by status;
