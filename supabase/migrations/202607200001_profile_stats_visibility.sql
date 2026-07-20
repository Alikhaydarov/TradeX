-- Lets a user hide their trading stats (win rate, P&L, avg R, trade count)
-- from their public profile while keeping them visible to themselves.
alter table public.profiles
  add column if not exists stats_visible boolean not null default true;
