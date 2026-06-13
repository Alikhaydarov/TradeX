create table if not exists public.prop_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  firm text not null default '',
  phase text not null default 'Challenge',
  market_type text not null default 'CFD',
  account_size numeric not null check (account_size > 0),
  initial_balance numeric not null check (initial_balance > 0),
  profit_target numeric not null default 0 check (profit_target >= 0),
  max_drawdown numeric not null default 0 check (max_drawdown >= 0),
  daily_drawdown numeric not null default 0 check (daily_drawdown >= 0),
  start_date date not null default current_date,
  status text not null default 'Active' check (status in ('Active','Passed','Failed','Paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.journal_entries add column if not exists prop_account_id uuid references public.prop_accounts(id) on delete set null;
create index if not exists prop_accounts_user_idx on public.prop_accounts(user_id, created_at desc);
create index if not exists journal_entries_prop_account_idx on public.journal_entries(prop_account_id, traded_at desc);
alter table public.prop_accounts enable row level security;

create policy "Users view own prop accounts" on public.prop_accounts for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create own prop accounts" on public.prop_accounts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own prop accounts" on public.prop_accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own prop accounts" on public.prop_accounts for delete to authenticated using ((select auth.uid()) = user_id);

insert into public.prop_accounts (user_id,name,market_type,account_size,initial_balance,profit_target,max_drawdown)
select user_id,account_name,max(market_type),greatest(max(account_size),1),greatest(max(account_size),1),max(profit_target),max(max_drawdown)
from public.journal_entries group by user_id,account_name on conflict (user_id,name) do nothing;

update public.journal_entries j set prop_account_id=a.id from public.prop_accounts a
where j.user_id=a.user_id and j.account_name=a.name and j.prop_account_id is null;
