alter table public.mt5_connections
  alter column login drop not null,
  alter column server drop not null,
  alter column password_encrypted drop not null;

alter table public.mt5_connections
  add column if not exists token_hash text,
  add column if not exists token_prefix text,
  add column if not exists last_seen_at timestamptz;

create unique index if not exists mt5_connections_token_hash_unique
  on public.mt5_connections(token_hash)
  where token_hash is not null;

