alter table public.posts
  add column if not exists trade_result text,
  add column if not exists pnl numeric,
  add column if not exists result_r numeric;

alter table public.posts
  drop constraint if exists posts_trade_result_check;

alter table public.posts
  add constraint posts_trade_result_check
  check (trade_result is null or trade_result in ('WIN', 'LOSS', 'BE'));

create index if not exists posts_trade_feed_idx
  on public.posts (created_at desc)
  where is_archived = false and symbol is not null and side is not null and trade_result is not null;
