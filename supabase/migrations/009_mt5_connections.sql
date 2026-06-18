create table if not exists public.mt5_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prop_account_id uuid not null references public.prop_accounts(id) on delete cascade,
  login text not null,
  server text not null,
  password_encrypted text not null,
  metaapi_account_id text,
  status text not null default 'disconnected',
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, prop_account_id)
);

alter table public.journal_entries
  add column if not exists external_source text,
  add column if not exists external_id text;

create unique index if not exists journal_entries_external_unique
  on public.journal_entries(user_id, external_source, external_id)
  where external_source is not null and external_id is not null;

alter table public.mt5_connections enable row level security;

drop policy if exists "Users manage own MT5 connections" on public.mt5_connections;
create policy "Users manage own MT5 connections"
on public.mt5_connections
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

