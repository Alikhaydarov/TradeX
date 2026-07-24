create table if not exists public.tradovate_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prop_account_id uuid not null references public.prop_accounts(id) on delete cascade,
  tradovate_user_id bigint,
  tradovate_account_id bigint,
  tradovate_account_name text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  environment text not null default 'live' check (environment in ('live', 'demo')),
  status text not null default 'connected' check (status in ('connected', 'error', 'disconnected')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prop_account_id)
);

create index if not exists tradovate_connections_user_idx
  on public.tradovate_connections(user_id);

alter table public.tradovate_connections enable row level security;

drop policy if exists "Users manage own Tradovate connections" on public.tradovate_connections;
create policy "Users manage own Tradovate connections"
  on public.tradovate_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
