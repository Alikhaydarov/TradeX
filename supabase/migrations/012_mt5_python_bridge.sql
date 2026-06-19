alter table public.mt5_connections
  alter column password_encrypted drop not null;

comment on column public.mt5_connections.password_encrypted is
  'Deprecated for MT5 Python bridge. MT5 access values should be supplied only per sync request and must not be stored.';
