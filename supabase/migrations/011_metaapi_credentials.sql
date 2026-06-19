alter table public.mt5_connections
  add column if not exists platform text not null default 'mt5';

drop index if exists mt5_connections_token_hash_unique;

