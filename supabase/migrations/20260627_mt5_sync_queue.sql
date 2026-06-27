create table if not exists public.mt5_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued',
  priority integer not null default 100,
  run_after timestamptz not null default now(),
  locked_until timestamptz,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  last_error text,
  requested_from timestamptz,
  requested_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mt5_sync_jobs
  drop constraint if exists mt5_sync_jobs_status_check,
  add constraint mt5_sync_jobs_status_check
    check (status in ('queued', 'running', 'done', 'error', 'cancelled'));

create index if not exists mt5_sync_jobs_worker_idx
  on public.mt5_sync_jobs(status, run_after, priority, created_at)
  where status = 'queued';

create index if not exists mt5_sync_jobs_account_idx
  on public.mt5_sync_jobs(account_id, created_at desc);

create unique index if not exists mt5_sync_jobs_active_account_unique
  on public.mt5_sync_jobs(account_id)
  where status in ('queued', 'running');

alter table public.mt5_sync_jobs enable row level security;

drop policy if exists "Users view own mt5 sync jobs" on public.mt5_sync_jobs;
create policy "Users view own mt5 sync jobs"
  on public.mt5_sync_jobs for select to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.mt5_sync_jobs is
  'Durable MT5 sync queue. Workers claim jobs with SKIP LOCKED to keep connector load stable at scale.';
