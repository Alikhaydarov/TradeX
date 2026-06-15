create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('Long', 'Short')),
  entry_price numeric not null check (entry_price > 0),
  exit_price numeric not null check (exit_price > 0),
  quantity numeric not null default 1 check (quantity > 0),
  fees numeric not null default 0 check (fees >= 0),
  pnl numeric not null,
  note text not null default '',
  traded_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backtest_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset text not null,
  strategy text not null,
  timeframe text not null,
  period text not null,
  initial_balance numeric not null check (initial_balance > 0),
  net_return numeric not null,
  win_rate numeric not null,
  max_drawdown numeric not null,
  profit_factor numeric not null,
  trades_count integer not null check (trades_count > 0),
  equity_curve jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists journal_entries_user_traded_idx
  on public.journal_entries(user_id, traded_at desc);
create index if not exists backtest_runs_user_created_idx
  on public.backtest_runs(user_id, created_at desc);

alter table public.post_likes enable row level security;
alter table public.post_bookmarks enable row level security;
alter table public.journal_entries enable row level security;
alter table public.backtest_runs enable row level security;

create policy "Likes are visible to everyone"
  on public.post_likes for select using (true);
create policy "Users can create own likes"
  on public.post_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can remove own likes"
  on public.post_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view own bookmarks"
  on public.post_bookmarks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own bookmarks"
  on public.post_bookmarks for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can remove own bookmarks"
  on public.post_bookmarks for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view own journal"
  on public.journal_entries for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own journal entries"
  on public.journal_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own journal entries"
  on public.journal_entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own journal entries"
  on public.journal_entries for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view own backtests"
  on public.backtest_runs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own backtests"
  on public.backtest_runs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own backtests"
  on public.backtest_runs for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.sync_post_likes_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target_post_id uuid;
begin
  target_post_id := coalesce(new.post_id, old.post_id);
  update public.posts
  set likes_count = (
    select count(*)::integer
    from public.post_likes
    where post_id = target_post_id
  )
  where id = target_post_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists post_likes_count_changed on public.post_likes;
create trigger post_likes_count_changed
  after insert or delete on public.post_likes
  for each row execute procedure public.sync_post_likes_count();

